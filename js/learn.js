/**
 * learn.js — Lesson module journey (7 modules, one at a time)
 *
 * Responsibilities:
 * - Display one lesson module at a time with Previous/Next navigation
 * - Show progress bar with milestone tally marks
 * - Save progress to Firestore on module advance
 * - Restore position on return visit (show "Welcome back!")
 */

// ─── Lesson Data ──────────────────────────────────────────────────────────
// Full accurate content based on the Indian Election Commission's process

const LESSONS = [
  {
    id: 1,
    num: 'Module 01',
    name: 'Voter Registration',
    body: [
      'Every Indian citizen who has turned 18 years of age by the qualifying date (1st January of the reference year) is entitled to register as a voter. Registration is done by filling Form 6, which is available online at the National Voters\' Service Portal (NVSP — voters.eci.gov.in) or at your nearest Electoral Registration Officer (ERO) office. You can also use the Voter Helpline number 1950 for guidance. Registering ensures your name appears on the Electoral Roll for your constituency.',
      'Once your application is verified, you receive an Elector\'s Photo Identity Card — commonly called the Voter ID or EPIC (Electoral Photo Identity Card). Your EPIC contains your photograph, name, address, a unique EPIC number, and the name of your constituency. It is issued by the Election Commission of India and serves as valid proof of identity not just for voting, but in many civic contexts.',
      'Electoral Rolls are updated periodically. The ECI conducts a Special Summary Revision (usually towards year-end) where new eligible citizens can enrol, existing voters can correct details (Form 8), and voters who have moved can transfer registration (Form 8A or Form 6 for a new constituency). If you have already turned 18 but missed the main registration window, you can apply throughout the year under continuous enrolment.',
      'Aadhaar linkage with Voter ID is now permitted under the Election Laws (Amendment) Act, 2021. This voluntary linkage helps purge duplicate entries from the roll. Non-Resident Indians (NRIs) who haven\'t acquired citizenship of another country can also register via Form 6A and vote in their home constituency in person.'
    ],
    keyFact: 'You can check whether your name is on the Electoral Roll by entering your details on voters.eci.gov.in — it takes under 30 seconds and is essential before every election.'
  },
  {
    id: 2,
    num: 'Module 02',
    name: 'Election Announcement & Model Code of Conduct',
    body: [
      'The Election Commission of India — constitutionally independent and consisting of the Chief Election Commissioner and two Election Commissioners — has the exclusive authority to announce and superintend elections. The ECI announces the election schedule at a formal press conference, after which the notification is published in the Official Gazette. The schedule specifies key dates: issuance of election notification, last date for nominations, scrutiny date, withdrawal deadline, polling date, and counting date.',
      'The moment the ECI announces the election schedule, the Model Code of Conduct (MCC) automatically comes into force across all relevant states and constituencies. The MCC is a set of guidelines — evolved by consensus since the 1960s — that governs the behaviour of political parties, candidates, and the incumbent government during the election period. Under the MCC, the government cannot announce new schemes, inaugurate projects, or make large transfers of officials that could give it an electoral advantage.',
      'The ECI deploys a comprehensive observer mechanism: General Observers (from the Indian Administrative Service) monitor overall election conduct; Police Observers (from the Indian Police Service) oversee law and order; and Expenditure Observers track campaign spending to ensure it stays within prescribed limits. Flying Squad Teams and Video Surveillance Teams are activated to catch violations on the ground.',
      'Elections to large states are often conducted in multiple phases to allow adequate security deployment. The Lok Sabha 2024 General Elections were conducted in seven phases over nearly two months — the largest single election event in human history, covering 543 constituencies and nearly one billion eligible voters.'
    ],
    keyFact: 'The MCC has no statutory backing — it is entirely based on voluntary compliance — yet political parties have largely respected it since the 5th General Elections in 1971.'
  },
  {
    id: 3,
    num: 'Module 03',
    name: 'Candidate Nomination & Scrutiny',
    body: [
      'Any Indian citizen aged 25 years or above (for the Lok Sabha and State Legislative Assemblies) who is a registered voter and is not otherwise disqualified under the Representation of the People Act, 1951 can contest an election. Candidates collect nomination forms from the office of the Returning Officer (RO) — the official designated by the ECI to conduct the election in that constituency — and file them within the specified window.',
      'Along with the nomination form, candidates must submit an affidavit disclosing their criminal antecedents (all pending cases and convictions), movable and immovable assets, liabilities, and educational qualifications. These affidavits are publicly available on the ECI\'s affidavit disclosure portal, giving voters crucial information to make informed decisions. Furnishing false information in the affidavit is a criminal offence.',
      'A security deposit must accompany the nomination: ₹25,000 for general-category candidates in Lok Sabha (₹12,500 for SC/ST candidates). This deposit is refunded if the candidate secures more than one-sixth of the total valid votes polled in the constituency; otherwise it is forfeited. This provision discourages frivolous candidates from contesting just to gain attention.',
      'After the last date for filing nominations, the Returning Officer scrutinises all nomination papers for legal correctness. Candidates whose papers have defects are given an opportunity to correct them. Following scrutiny, a withdrawal window (typically 2 days) allows candidates to reconsider. After the withdrawal deadline, the final list of contesting candidates is published and ballot order is determined by draw of lots.'
    ],
    keyFact: 'Candidate affidavits disclosing criminal cases, assets, and education qualifications can be viewed publicly on the ECI\'s National Affidavit Disclosure Portal.'
  },
  {
    id: 4,
    num: 'Module 04',
    name: 'Election Campaigning',
    body: [
      'The campaign period — typically about two weeks before polling day — is when democratic energy reaches its peak. Political parties and candidates hold public rallies, conduct door-to-door canvassing, distribute printed materials, release audio-visual advertisements, and run extensive social media and digital campaigns. All campaign activities must comply with the Model Code of Conduct, which prohibits personal attacks, appeals to religion or caste that may inflame communal tensions, and use of government resources for party benefit.',
      'Campaign expenditure is strictly regulated. For Lok Sabha constituencies, the limit is ₹95 lakhs per candidate (revised in 2022). Expenditure Observers maintain shadow accounts of candidate spending. Expenditure by the political party on behalf of a candidate — such as a national leader\'s rally for that candidate — is attributed to the candidate\'s account. Violations can lead to disqualification from the election.',
      'A mandatory Campaign Silence Period begins exactly 48 hours before the polling start time in a constituency. From this point, no rallies, processions, public meetings, loudspeaker use, or any form of canvassing is permitted. This cooling-off period gives voters quiet time for reflection before they exercise their franchise. Section 126 of the Representation of the People Act, 1951 makes violations a criminal offence punishable by up to two years in prison.',
      'Voters should also know about NOTA — None Of The Above — an option introduced on EVMs following a Supreme Court order in the PUCL case (2013). NOTA allows voters to formally register their rejection of all candidates on the ballot. While a NOTA vote doesn\'t change the outcome (the candidate with the highest votes still wins), it is a powerful civic statement and is tracked separately in official results.'
    ],
    keyFact: 'The Campaign Silence Period is 48 hours — not 24 — and violating it is a criminal offence under Section 126 of the Representation of the People Act, 1951.'
  },
  {
    id: 5,
    num: 'Module 05',
    name: 'Voting Day',
    body: [
      'Polling stations open at 7:00 AM and close at 6:00 PM. All voters who are in the queue inside or at the gate of the polling station at 6:00 PM are entitled to vote. Each voter is allotted to a specific polling station based on their registered address — you can find your polling station on voters.eci.gov.in or via the Voter Helpline 1950. Polling stations must be within 2 km of the voter\'s residence.',
      'While the Voter ID (EPIC) is the primary identity document, the ECI officially accepts 12 alternative documents: Aadhaar Card, Passport, Driving Licence, Service Identity Cards issued by Central/State Governments, PAN Card, Smart Card issued by RGI under NPR, MNREGA Job Card, Health Insurance Smart Card issued under ESI Scheme, Pension Document with photograph, Bank/Post Office Passbook with photograph, and the Voter Information Slip issued by the ERO (for verification alongside one of the above).',
      'India\'s Electronic Voting Machine (EVM) is a tamper-resistant, standalone device with no connectivity to any network. Balloting Units display candidate names, party symbols, and photographs. When you press the blue button next to your chosen candidate, a beep confirms your vote. Since 2019, every EVM is paired with a Voter Verifiable Paper Audit Trail (VVPAT) machine: a printed slip of your vote appears in a transparent window for 7 seconds before dropping into a sealed compartment — giving you visible confirmation.',
      'After voting, the left index finger of every voter is marked with Indelible Ink — a silver nitrate-based chemical that stains the skin and persists for 2–4 weeks. This is manufactured exclusively by the Mysore Paints and Varnish Limited (MPVL), a Karnataka government undertaking, and has been used since the 1962 elections. Voters with Disabilities (PwD), Senior Citizens (80+), and Persons with Illnesses are eligible for Postal Ballot or Home Voting under the ECI\'s accessible elections initiative.'
    ],
    keyFact: 'India\'s EVMs are not connected to any network — they work as a closed, standalone electronic system — making remote hacking technically impossible.'
  },
  {
    id: 6,
    num: 'Module 06',
    name: 'Vote Counting & Results',
    body: [
      'After polling concludes, all EVMs are sealed by the Presiding Officer in the presence of polling agents of candidates, and transported under multi-layer security to designated Strong Rooms — fortified, air-conditioned facilities with 24/7 CCTV surveillance, multiple physical locks (with keys held separately by the Returning Officer and candidate representatives), and Central Armed Police Forces (CAPF) guard. Strong rooms remain sealed until Counting Day.',
      'Counting Day is announced separately in the election schedule — often 2–3 weeks after the final phase of polling, to allow time for postal ballot processing. Counting begins at 8:00 AM. Strong Rooms are opened in the presence of the Returning Officer, counting agents, and Election Observers. Postal ballots are counted first (as they are paper-based); EVM counting follows in rounds.',
      'Each round of counting covers a batch of EVMs from the same polling station area. Results are announced round by round on large display boards inside the counting hall. Candidates and media track the cumulative totals as they build. The candidate with the most valid votes wins — India uses a simple First Past the Post (FPTP) system with no minimum threshold. The margin can be as low as a single vote in rare cases.',
      'Once all rounds are complete, the Returning Officer signs the declaration of results and issues the Election Certificate to the winning candidate. The ECI compiles all constituency results and officially publishes them in the Official Gazette. Losing candidates can challenge results in an Election Petition before the High Court — the only judicial remedy under the Representation of the People Act, 1951.'
    ],
    keyFact: 'During Lok Sabha 2024, the ECI counted over 640 million votes in a single day — more than the combined votes cast in the United States and European Union elections combined.'
  },
  {
    id: 7,
    num: 'Module 07',
    name: 'Government Formation & Swearing In',
    body: [
      'After the ECI announces the final results of the Lok Sabha election, the President of India plays a constitutionally crucial role in forming the new government. If a single party has won 272 or more seats (an absolute majority in the 543-seat house), the President invites the leader of that party to form the government. If no single party has a majority — a \'hung parliament\' — the President applies established constitutional conventions: inviting the leader of the largest single party or the pre-poll alliance with the most seats and ability to demonstrate support.',
      'The Prime Minister-designate is sworn in at Rashtrapati Bhavan by the President of India in a formal ceremony. The oath of office commits the PM to bear true faith and allegiance to the Constitution, faithfully discharge duties, and do right to all manner of people without fear or favour. The oath of secrecy follows — the PM pledges not to reveal Cabinet deliberations. The Cabinet ministers are sworn in simultaneously or shortly after.',
      'If the President has any doubt about whether the invited party actually commands majority support, the President may ask the new Prime Minister to prove majority on the floor of the Lok Sabha within a specified period — typically 30 days. This Constitutional Floor Test requires a simple majority of members present and voting. If the government fails the floor test, the President can dissolve the Lok Sabha and call fresh elections.',
      'In State elections, the parallel process is carried out by the Governor, who invites the party or alliance leader to become Chief Minister, sworn in at the Raj Bhavan. The state Cabinet is then formed. The outgoing government continues in a caretaker capacity — handling only routine administrative business — until the new government is formally sworn in and takes charge. This transition period is governed by established constitutional conventions and the discretion of the Governor.'
    ],
    keyFact: 'Article 75(3) of the Indian Constitution states that the Council of Ministers shall be collectively responsible to the House of the People — the bedrock principle of India\'s parliamentary democracy.'
  }
];

// ─── State ─────────────────────────────────────────────────────────────────

let _currentIndex = 0;
let _completedModules = new Set();

// ─── DOM Helpers ───────────────────────────────────────────────────────────

const qs = (sel, ctx = document) => ctx.querySelector(sel);

const setProgressBar = (index) => {
  const total = LESSONS.length;
  const pct = (index / total) * 100;

  const fill = qs('#progress-fill');
  if (fill) fill.style.width = `${pct}%`;

  const label = qs('#progress-module-label');
  if (label) label.textContent = index >= total
    ? 'All 7 Modules Complete!'
    : `Module ${index + 1} of ${total}`;

  // Update milestone tally marks
  for (let i = 1; i <= total; i++) {
    const mark = qs(`#milestone-${i}`);
    if (mark) mark.classList.toggle('done', i <= index);
  }
};

const renderLesson = (index) => {
  const lesson = LESSONS[index];
  if (!lesson) return;

  // Update module number + title
  const numEl = qs('#lesson-module-num');
  if (numEl) numEl.textContent = lesson.num;

  const titleEl = qs('#lesson-title');
  if (titleEl) titleEl.textContent = lesson.name;

  // Body paragraphs
  const bodyEl = qs('#lesson-body');
  if (bodyEl) {
    bodyEl.innerHTML = lesson.body
      .map(para => `<p>${para}</p>`)
      .join('');
  }

  // Key fact
  const factEl = qs('#lesson-key-fact');
  if (factEl) {
    factEl.innerHTML = `
      <div class="key-fact-label">Key Fact</div>
      <p>${lesson.keyFact}</p>
    `;
  }

  // Navigation buttons
  const prevBtn = qs('#btn-prev');
  if (prevBtn) prevBtn.disabled = index === 0;

  const nextBtn = qs('#btn-next');
  if (nextBtn) nextBtn.textContent = index === LESSONS.length - 1
    ? 'Finish Course ✓'
    : 'Next Module →';

  const testBtn = qs('#btn-test');
  if (testBtn) testBtn.href = `quiz.html?module=${index}`;

  setProgressBar(index);

  // Smooth scroll to top of lesson card
  qs('#lesson-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const advanceModule = async (newIndex) => {
  // Mark current as completed before advancing
  _completedModules.add(_currentIndex);

  try {
    await window.FirebaseService?.completeModule(_currentIndex);
  } catch (_) { /* silent */ }

  if (newIndex >= LESSONS.length) {
    // All modules done — go to checklist
    window.location.href = 'checklist.html';
    return;
  }

  _currentIndex = newIndex;
  renderLesson(_currentIndex);
};

// ─── Init ─────────────────────────────────────────────────────────────────

const init = async () => {
  // Initialize Firebase and load progress
  try {
    await window.FirebaseService?.init();
    const progress = await window.FirebaseService?.loadProgress();

    if (progress) {
      _completedModules = new Set(progress.completedModules || []);
      const savedIndex = progress.currentModule || 0;

      if (savedIndex > 0) {
        // Returning user — show welcome back message
        const welcome = qs('#welcome-back');
        if (welcome) {
          welcome.classList.add('visible');
          welcome.textContent = `Welcome back! Resuming from Module ${savedIndex + 1} — ${LESSONS[savedIndex]?.name || ''}.`;
        }
        _currentIndex = Math.min(savedIndex, LESSONS.length - 1);
      }
    }
  } catch (_) { /* graceful degradation */ }

  renderLesson(_currentIndex);

  // Navigation listeners
  qs('#btn-prev')?.addEventListener('click', () => {
    if (_currentIndex > 0) {
      _currentIndex--;
      renderLesson(_currentIndex);
    }
  });

  qs('#btn-next')?.addEventListener('click', () => {
    advanceModule(_currentIndex + 1);
  });

  // "Test Me" — also marks module as done
  qs('#btn-test')?.addEventListener('click', () => {
    _completedModules.add(_currentIndex);
    window.FirebaseService?.completeModule(_currentIndex).catch(() => {});
  });

  qs('.learn-page')?.classList.add('page-entry');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
