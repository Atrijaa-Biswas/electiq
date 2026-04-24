/**
 * flowmap.js — Interactive Election Flow Map
 *
 * Responsibilities:
 * - Render 7 election stage nodes in a phased flowchart
 * - Handle node click → slide in dossier side panel
 * - Keyboard navigation (Tab to reach nodes, Enter to open, ESC to close)
 * - Gemini inline chat per stage
 * - Mark nodes as "explored" after viewing
 * - Load/save explored state via FirebaseService
 */

// ─── Election Stage Data ───────────────────────────────────────────────────

const STAGES = [
  {
    id: 1,
    num: '01',
    name: 'Voter Registration',
    desc: 'Enrol on the Electoral Roll',
    phase: 'pre',
    timeline: 'Ongoing — closes ~30 days before polling',
    icon: 'assets/icons/stage-01.svg',
    content: [
      'Every Indian citizen aged 18 or above has the constitutional right — and responsibility — to register as a voter. Registration is done through Form 6, which can be submitted online at the National Voters\' Service Portal (NVSP) at voters.eci.gov.in, or at your local Electoral Registration Officer (ERO) office. You can also call the Voter Helpline at 1950 for assistance.',
      'Once registered, you receive your Voter ID card, officially called the Elector\'s Photo Identity Card (EPIC). This is your primary proof of voter identity. The Election Commission of India periodically conducts Special Summary Revisions to update the Electoral Roll, adding newly eligible voters and removing those who have moved or passed away.',
      'Aadhaar linkage with Voter ID is now enabled under the Election Laws (Amendment) Act 2021. This is voluntary and helps eliminate duplicate entries. If your address has changed, you file Form 8A (within same constituency) or Form 6 again for a new constituency. Non-resident Indians (NRIs) can register in their home constituency via Form 6A.',
      'Your EPIC contains your photo, name, address, and a unique EPIC number. Keep it safely — you\'ll need it (or one of 12 alternative IDs) on polling day.'
    ],
    keyFact: 'India\'s Electoral Roll has over 970 million registered voters — the largest in any democracy on Earth.'
  },
  {
    id: 2,
    num: '02',
    name: 'Election Announcement & MCC',
    desc: 'ECI sets the schedule and MCC kicks in',
    phase: 'pre',
    timeline: 'Typically 60–90 days before Election Day',
    icon: 'assets/icons/stage-02.svg',
    content: [
      'The Election Commission of India (ECI) — a constitutionally independent body — announces the election schedule by holding a press conference and issuing the formal notification in the Official Gazette. This announcement specifies the dates for issuance of the election notification, last date for filing nominations, scrutiny date, withdrawal deadline, polling date, and counting date.',
      'The moment the ECI announces the election schedule, the Model Code of Conduct (MCC) comes into force automatically and immediately. The MCC is a set of guidelines the ECI has evolved over decades to ensure free and fair elections. Under the MCC, the ruling government cannot announce new welfare schemes, use government machinery for party purposes, or make large appointments that could influence voters.',
      'The ECI also deploys Central Observer teams — including General Observers, Police Observers, and Expenditure Observers — across all constituencies. Expenditure Observers monitor that candidates don\'t exceed the spending limit (currently ₹95 lakhs per Lok Sabha constituency). Flying Squads and Video Surveillance Teams are activated to catch violations.',
      'The period from announcement to polling day is typically 45–60 days, though multi-phase elections in large states can stretch this timeline. The MCC remains in force until the election process is completely concluded and the new government takes office.'
    ],
    keyFact: 'The Model Code of Conduct has no statutory backing — it is purely voluntary compliance — yet political parties have respected it since the 1960s.'
  },
  {
    id: 3,
    num: '03',
    name: 'Candidate Nomination & Scrutiny',
    desc: 'Filing papers, security deposits & final list',
    phase: 'pre',
    timeline: '~40–45 days before Election Day',
    icon: 'assets/icons/stage-03.svg',
    content: [
      'Any Indian citizen who is at least 25 years old (for Lok Sabha), is a registered voter, and is not disqualified under any law can contest an election. Candidates obtain nomination forms from the Returning Officer (RO) of their constituency and file them — along with an affidavit disclosing criminal record, assets, liabilities, and educational qualifications — at the RO\'s office.',
      'A security deposit must accompany the nomination: ₹25,000 for general category candidates in Lok Sabha (₹12,500 for SC/ST candidates). This deposit is forfeited if the candidate fails to secure more than one-sixth of the valid votes in that constituency. This provision discourages frivolous candidatures.',
      'After the nomination deadline, the RO scrutinises all nomination papers for correctness. Candidates whose papers have defects are given an opportunity to correct them. After scrutiny, there is a withdrawal window — typically 2 days — during which candidates can withdraw their candidature. After this deadline, the final list of contesting candidates is published.',
      'The drawing of lots determines ballot order on the EVM (Electronic Voting Machine). The EVM displays candidate names, party symbols, and photos in the order determined. Independent candidates who win the right to a reserved symbol also have their symbol displayed.'
    ],
    keyFact: 'Candidates must declare their criminal cases, assets, and educational qualifications in a public affidavit — voters can view this on the ECI\'s Affidavit Portal.'
  },
  {
    id: 4,
    num: '04',
    name: 'Election Campaigning',
    desc: 'Rallies, silence period & expenditure limits',
    phase: 'day',
    timeline: '~2 weeks before polling day',
    icon: 'assets/icons/stage-04.svg',
    content: [
      'The campaign period in Indian elections is one of the world\'s most vibrant political spectacles. Candidates and parties hold rallies, conduct door-to-door canvassing, distribute printed materials, air television and radio advertisements, and run digital campaigns. All campaigning must comply with the Model Code of Conduct and respective campaign finance laws.',
      'Expenditure limits are strictly enforced. For Lok Sabha constituencies, the limit is ₹95 lakhs (increased in 2022). Expenditure Observers and Accounting Teams audit candidate spending. Any expenditure by a political party on behalf of a candidate also counts towards the candidate\'s limit. Violation can lead to disqualification.',
      'A mandatory Campaign Silence Period begins 48 hours before the polling start time. During this period, no rallies, public meetings, processions, loudspeaker announcements, or canvassing of any kind are permitted. This allows voters a period of quiet reflection before they cast their vote.',
      'NOTA (None Of The Above) is available on every EVM, giving voters the right to formally reject all candidates. Introduced by the Supreme Court\'s 2013 PUCL judgment, NOTA has been exercised by millions of voters in subsequent elections, sending a powerful civic message.'
    ],
    keyFact: 'The 48-hour campaign silence period before polling is legally mandated under Section 126 of the Representation of the People Act, 1951.'
  },
  {
    id: 5,
    num: '05',
    name: 'Voting Day',
    desc: 'EVMs, VVPAT, indelible ink & your vote',
    phase: 'day',
    timeline: 'Polling day — 7:00 AM to 6:00 PM',
    icon: 'assets/icons/stage-05.svg',
    content: [
      'Polling stations open at 7:00 AM and close at 6:00 PM. Every voter must bring a valid photo identity document — the Voter ID (EPIC) is primary, but the ECI accepts 12 alternative documents including Aadhaar Card, Passport, PAN Card, Driving Licence, Job Card issued by NREGA, or the Voter Information Slip. Voters are not turned away for lack of EPIC alone.',
      'India uses Electronic Voting Machines (EVMs) — two-unit systems consisting of a Control Unit (with the Presiding Officer) and a Balloting Unit (in the voting compartment). Since 2019, every EVM is paired with a Voter Verifiable Paper Audit Trail (VVPAT) machine that prints a slip visible through a window for 7 seconds, allowing the voter to verify their vote before it drops into the sealed compartment.',
      'After voting, the left index finger is marked with indelible ink — a chemical that persists for 1–2 weeks. This prevents duplicate voting. The ink was introduced in 1962 and is manufactured exclusively by the Mysore Paints and Varnish Limited (MPVL), a Karnataka government undertaking.',
      'Persons with Disabilities (PwD) voters receive priority access at polling stations. Special ramps, wheelchairs, and Braille-enabled EVMs are provided. Elderly voters above 80 years and PwD voters can also apply for postal ballot or home voting under the ECI\'s accessible elections initiative.'
    ],
    keyFact: 'VVPAT verification requires 100% EVM-VVPAT match for 5 randomly selected EVMs per assembly segment — mandated by the Supreme Court in 2019.'
  },
  {
    id: 6,
    num: '06',
    name: 'Vote Counting & Results',
    desc: 'Strong rooms, tallying rounds & official results',
    phase: 'post',
    timeline: 'Counting Day — announced separately from polling',
    icon: 'assets/icons/stage-06.svg',
    content: [
      'After polling concludes, EVMs are sealed by the Presiding Officer, signed by candidate representatives, and transported under heavy security to designated Strong Rooms — secure, air-conditioned facilities with 24/7 CCTV surveillance, multiple locks (keys held separately by RO and candidates), and CAPF paramilitary guard. EVMs remain here until Counting Day.',
      'Counting Day is announced separately in the election schedule. It begins at 8:00 AM. Strong Rooms are opened in the presence of candidates or their counting agents, the Returning Officer, and Election Observers. Votes for postal ballots are counted first; EVM counting follows.',
      'Counting proceeds round by round, with each round covering a batch of EVMs from the same polling station area. Results are announced round by round on a large display board. Candidates and media track the cumulative totals as they build up. The candidate with the highest number of valid votes in a constituency wins — India uses the First Past the Post (FPTP) system.',
      'The Returning Officer formally declares the result and issues the election certificate to the winning candidate. The ECI compiles all constituency results and officially declares the national/state election result. These official results are published in the Official Gazette.'
    ],
    keyFact: 'In Lok Sabha 2024, over 640 million votes were counted across India — an electoral exercise no other country has ever attempted at this scale.'
  },
  {
    id: 7,
    num: '07',
    name: 'Government Formation & Swearing In',
    desc: 'President\'s role, floor test & oath-taking',
    phase: 'post',
    timeline: '10–30 days after results',
    icon: 'assets/icons/stage-07.svg',
    content: [
      'After the ECI declares the Lok Sabha election results, the President of India invites the leader of the party or coalition with a clear majority (272+ seats in a 543-seat house) to form the government. If no single party has a majority, the President uses discretion guided by constitutional convention — typically inviting the largest single party or the pre-poll alliance with the most seats.',
      'The invited leader is sworn in as Prime Minister at Rashtrapati Bhavan in a formal ceremony administered by the President. This marks the formal assumption of executive authority. The Cabinet is sworn in simultaneously or shortly after — each minister takes an oath of office and secrecy.',
      'If there is doubt about majority support, the President may impose a condition that the new PM prove majority on the floor of the Lok Sabha within a specified time (typically 15–30 days). This Constitutional mechanism — the Floor Test — prevents a minority government from assuming power indefinitely. A vote of confidence is moved and if the government loses, fresh elections may be called.',
      'In states, the equivalent process is conducted by the Governor, who invites the party/alliance leader to become Chief Minister, sworn in at the Raj Bhavan. The state Cabinet is formed similarly. The outgoing government continues in a caretaker capacity until the new government is sworn in.'
    ],
    keyFact: 'Article 75(3) of the Constitution mandates that the Council of Ministers is collectively responsible to the Lok Sabha — the foundation of India\'s parliamentary democracy.'
  }
];

// ─── State ─────────────────────────────────────────────────────────────────

let _exploredStages = new Set();
let _activePanelId = null;
let _chatHistories = {}; // keyed by stage id
let _chatOpen = false;
let _geminiPending = false;

// ─── DOM Helpers ──────────────────────────────────────────────────────────

const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/** Show a friendly error in the chat area */
const showChatError = (container, msg) => {
  const div = document.createElement('div');
  div.className = 'chat-msg error';
  div.textContent = msg;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
};

// ─── Render Flowchart ─────────────────────────────────────────────────────

const renderFlowchart = () => {
  const container = qs('#flowchart-container');
  if (!container) return;

  const phases = [
    { key: 'pre',  label: 'Pre-Election Phase',  stages: STAGES.filter(s => s.phase === 'pre')  },
    { key: 'day',  label: 'Election Day Phase',   stages: STAGES.filter(s => s.phase === 'day')  },
    { key: 'post', label: 'Post-Election Phase',  stages: STAGES.filter(s => s.phase === 'post') }
  ];

  phases.forEach((phase, pIdx) => {
    // Phase connector between groups
    if (pIdx > 0) {
      const connector = document.createElement('div');
      connector.className = 'phase-connector';
      connector.setAttribute('aria-hidden', 'true');
      connector.textContent = '↓';
      container.appendChild(connector);
    }

    const group = document.createElement('div');
    group.className = 'phase-group';

    const header = document.createElement('div');
    header.className = 'phase-group-header';
    const phaseLabel = document.createElement('span');
    phaseLabel.className = `phase-label phase-${phase.key}`;
    phaseLabel.textContent = phase.label;
    header.appendChild(phaseLabel);
    group.appendChild(header);

    const row = document.createElement('div');
    row.className = 'nodes-row';

    phase.stages.forEach((stage, sIdx) => {
      // Connector between nodes in same row
      if (sIdx > 0) {
        const conn = document.createElement('div');
        conn.className = 'node-connector';
        conn.setAttribute('aria-hidden', 'true');
        row.appendChild(conn);
      }

      const card = document.createElement('button');
      card.className = `node-card phase-${phase.key}${_exploredStages.has(stage.id) ? ' completed' : ''}`;
      card.setAttribute('data-stage-id', stage.id);
      card.setAttribute('type', 'button');
      card.setAttribute('aria-label', `Stage ${stage.num}: ${stage.name} — click to explore`);
      card.setAttribute('aria-expanded', 'false');

      card.innerHTML = `
        <div class="node-number">${stage.num}</div>
        <img class="node-icon" src="${stage.icon}" alt="${stage.name} icon" width="60" height="60">
        <div class="node-name">${stage.name}</div>
        <p class="node-desc">${stage.desc}</p>
        <svg class="node-check" viewBox="0 0 28 28" fill="none" aria-label="Explored" role="img">
          <circle cx="14" cy="14" r="13" fill="#2D6A4F" opacity="0.9"/>
          <path d="M8 14l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      card.addEventListener('click', () => openPanel(stage));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(stage); }
      });

      row.appendChild(card);
    });

    group.appendChild(row);
    container.appendChild(group);
  });
};

// ─── Side Panel ───────────────────────────────────────────────────────────

const openPanel = (stage) => {
  const panel = qs('#side-panel');
  const overlay = qs('#panel-overlay');
  if (!panel || !overlay) return;

  _activePanelId = stage.id;

  // Build panel content
  qs('#panel-tab-title', panel).textContent = stage.name;
  qs('#panel-stage-num', panel).textContent = stage.num;
  qs('#panel-stage-name', panel).textContent = stage.name;
  qs('#panel-timeline', panel).textContent = `⏱ ${stage.timeline}`;

  const contentEl = qs('#panel-content', panel);
  contentEl.innerHTML = stage.content
    .map(para => `<p>${para}</p>`)
    .join('');

  // Key fact
  qs('#panel-key-fact', panel).innerHTML = `
    <div class="key-fact-label">Key Fact</div>
    <p>${stage.keyFact}</p>
  `;

  // Reset chat section
  const chatSection = qs('#chat-section', panel);
  chatSection.classList.remove('open');
  _chatOpen = false;

  // Restore existing chat history for this stage if any
  const historyEl = qs('#chat-history', panel);
  historyEl.innerHTML = '';
  if (_chatHistories[stage.id]) {
    _chatHistories[stage.id].forEach(msg => appendChatMsg(historyEl, msg.role, msg.text));
  }

  // Open panel
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  overlay.classList.add('visible');

  // Mark node as explored
  markExplored(stage.id);

  // Focus the close button for keyboard users
  qs('#panel-close', panel).focus();
};

const closePanel = () => {
  const panel = qs('#side-panel');
  const overlay = qs('#panel-overlay');
  if (!panel) return;

  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('visible');

  // Return focus to the node that was clicked
  if (_activePanelId) {
    const card = qs(`[data-stage-id="${_activePanelId}"]`);
    if (card) card.focus();
  }
  _activePanelId = null;
};

// ─── Explored State ───────────────────────────────────────────────────────

const markExplored = async (stageId) => {
  if (_exploredStages.has(stageId)) return;
  _exploredStages.add(stageId);

  // Update card UI
  const card = qs(`[data-stage-id="${stageId}"]`);
  if (card) card.classList.add('completed');

  // Persist
  try {
    await window.FirebaseService?.saveProgress({ exploredStages: [..._exploredStages] });
  } catch (_) { /* silent — not critical */ }
};

// ─── Gemini Chat ──────────────────────────────────────────────────────────

const appendChatMsg = (container, role, text) => {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
};

const sendChatMessage = async () => {
  if (_geminiPending) return;

  const panel = qs('#side-panel');
  const input = qs('#chat-input', panel);
  const historyEl = qs('#chat-history', panel);
  const submitBtn = qs('#chat-submit', panel);

  const question = input.value.trim();
  if (!question) return;

  // Show user message
  appendChatMsg(historyEl, 'user', question);
  if (!_chatHistories[_activePanelId]) _chatHistories[_activePanelId] = [];
  _chatHistories[_activePanelId].push({ role: 'user', text: question });

  input.value = '';
  input.disabled = true;
  submitBtn.disabled = true;
  _geminiPending = true;

  // Loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chat-msg gemini';
  loadingDiv.innerHTML = '<span class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;display:inline-block;vertical-align:middle;"></span> Thinking…';
  historyEl.appendChild(loadingDiv);
  historyEl.scrollTop = historyEl.scrollHeight;

  try {
    const activeStage = STAGES.find(s => s.id === _activePanelId);
    const systemPrompt = window.GeminiAPI.flowmapSystemPrompt(activeStage?.name || '');
    const answer = await window.GeminiAPI.call(systemPrompt, question);

    historyEl.removeChild(loadingDiv);
    appendChatMsg(historyEl, 'gemini', answer);
    _chatHistories[_activePanelId].push({ role: 'gemini', text: answer });

  } catch (err) {
    historyEl.removeChild(loadingDiv);
    showChatError(historyEl, `Sorry, something went wrong: ${err.message}`);
  } finally {
    input.disabled = false;
    submitBtn.disabled = false;
    _geminiPending = false;
    input.focus();
  }
};

// ─── Initialisation ───────────────────────────────────────────────────────

const init = async () => {
  // ── Auth guard: redirect to login if not authenticated ─────────────────
  // HeaderController.init() waits for Firebase Auth to resolve, reveals the
  // body only after the check passes, and injects the user avatar/dropdown.
  await window.HeaderController.init();

  // Initialize Firestore and load prior explored stages
  try {
    await window.FirebaseService?.init();
    const progress = await window.FirebaseService?.loadProgress();
    if (progress?.exploredStages) {
      _exploredStages = new Set(progress.exploredStages);
    }
  } catch (_) { /* graceful degradation */ }

  renderFlowchart();

  // Panel close button
  const closeBtn = qs('#panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Overlay click closes panel
  const overlay = qs('#panel-overlay');
  if (overlay) overlay.addEventListener('click', closePanel);

  // ESC key closes panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _activePanelId) closePanel();
  });

  // Ask Gemini toggle
  const askBtn = qs('#btn-ask-gemini');
  if (askBtn) {
    askBtn.addEventListener('click', () => {
      const chatSection = qs('#chat-section');
      _chatOpen = !_chatOpen;
      chatSection.classList.toggle('open', _chatOpen);
      if (_chatOpen) qs('#chat-input')?.focus();
    });
  }

  // Chat submit
  const chatSubmit = qs('#chat-submit');
  if (chatSubmit) chatSubmit.addEventListener('click', sendChatMessage);

  // Chat input Enter key
  const chatInput = qs('#chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
  }

  // Page entry animation
  qs('.flowmap-page')?.classList.add('page-entry');
};

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
