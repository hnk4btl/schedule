// ========== STATE MANAGEMENT ==========
const tournamentState = {
  schedule: [],
  currentMatchIndex: 0,
  playerStats: [],
  config: {
    numPlayers: 16,
    numCourts: 2,
    numRounds: 10
  }
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  loadTournamentState();
  setupEventListeners();
});

function initializeUI() {
  document.getElementById('numPlayers').value = tournamentState.config.numPlayers;
  document.getElementById('numCourts').value = tournamentState.config.numCourts;
  document.getElementById('numRounds').value = tournamentState.config.numRounds;
}

function loadTournamentState() {
  const savedData = localStorage.getItem('badmintonTournamentData');
  if (savedData) {
    const data = JSON.parse(savedData);
    tournamentState.schedule = data.schedule || [];
    tournamentState.currentMatchIndex = data.currentMatchIndex || 0;
    tournamentState.playerStats = data.playerStats || [];
    tournamentState.config = data.config || {
      numPlayers: 16,
      numCourts: 2,
      numRounds: 10
    };
    
    updateUIFromState();
    renderSchedule();
    renderStatistics();
  }
}

function saveTournamentState() {
  const data = {
    schedule: tournamentState.schedule,
    currentMatchIndex: tournamentState.currentMatchIndex,
    playerStats: tournamentState.playerStats,
    config: tournamentState.config
  };
  localStorage.setItem('badmintonTournamentData', JSON.stringify(data));
}

// ========== EVENT HANDLERS ==========
function setupEventListeners() {
  document.getElementById('generateBtn').addEventListener('click', generateSchedule);
  document.getElementById('clearBtn').addEventListener('click', clearTournamentData);
  document.getElementById('matchSelect').addEventListener('change', (e) => jumpToMatch(parseInt(e.target.value)));
  document.getElementById('nextMatchBtn').addEventListener('click', nextMatch);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn2').addEventListener('click', closeModal);
  document.getElementById('nextMatchModalBtn').addEventListener('click', nextMatch);
  document.getElementById('prevMatchBtn').addEventListener('click', prevMatch);
}

// ========== SCHEDULE GENERATION ==========
function generateSchedule() {
  tournamentState.config = {
    numPlayers: parseInt(document.getElementById('numPlayers').value),
    numCourts: parseInt(document.getElementById('numCourts').value),
    numRounds: parseInt(document.getElementById('numRounds').value)
  };

  if (!validateInputs()) return;

  const players = Array.from({length: tournamentState.config.numPlayers}, (_, i) => i + 1);
  initializePlayerStats(players);

  tournamentState.schedule = generateSmartSchedule(players);

  tournamentState.currentMatchIndex = 0;
  saveTournamentState();
  updateUIFromState();
  renderSchedule();
  renderStatistics();
  showCurrentMatch();
}

function validateInputs() {
  const { numPlayers, numCourts } = tournamentState.config;
  
  if (numPlayers < numCourts * 4) {
    alert(`Số người chơi phải lớn hơn hoặc bằng ${numCourts * 4} (4 người/sân)`);
    return false;
  }
  
  return true;
}

function initializePlayerStats(players) {
  tournamentState.playerStats = players.map(player => ({
    id: player,
    matchesPlayed: 0,
    lastPlayedRound: -1,
    consecutiveRounds: 0,
    partners: new Set(),
    opponents: new Set()
  }));
}

// ========== SMART SCHEDULING ALGORITHM ==========
function generateSmartSchedule(players) {
  const { numCourts, numRounds } = tournamentState.config;
  const schedule = [];
  
  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    const usedPlayers = new Set();
    
    let availablePlayers = [...players].sort(() => Math.random() - 0.5);
    
    availablePlayers.sort((a, b) => {
      const statsA = tournamentState.playerStats[a - 1];
      const statsB = tournamentState.playerStats[b - 1];
      
      if (statsA.matchesPlayed !== statsB.matchesPlayed) {
        return statsA.matchesPlayed - statsB.matchesPlayed;
      }
      
      const restA = round - statsA.lastPlayedRound - 1;
      const restB = round - statsB.lastPlayedRound - 1;
      return restB - restA;
    });
    
    for (let court = 0; court < numCourts; court++) {
      const matchPlayers = [];
      
      for (const player of availablePlayers) {
        if (!usedPlayers.has(player) && canPlayInRound(player, round)) {
          matchPlayers.push(player);
          usedPlayers.add(player);
          
          if (matchPlayers.length === 4) break;
        }
      }
      
      if (matchPlayers.length < 4) {
        const remainingPlayers = availablePlayers.filter(p => !usedPlayers.has(p));
        matchPlayers.push(...remainingPlayers.slice(0, 4 - matchPlayers.length));
        matchPlayers.slice(0, 4).forEach(p => usedPlayers.add(p));
      }
      
      if (matchPlayers.length < 4) {
        alert('Không đủ người chơi để tạo trận đấu. Vui lòng giảm số sân hoặc tăng số người chơi.');
        return [];
      }
      
      roundMatches.push(matchPlayers);
    }
    
    schedule.push(roundMatches);
    updatePlayerStatsForRound(roundMatches, round);
  }
  
  return schedule;
}

function canPlayInRound(playerId, round) {
  const stats = tournamentState.playerStats[playerId - 1];
  
  if (stats.lastPlayedRound === -1) return true;
  if (stats.lastPlayedRound < round - 1) return true;
  if (stats.consecutiveRounds < 2) return true;
  
  return false;
}

function updatePlayerStatsForRound(roundMatches, round) {
  roundMatches.forEach(match => {
    match.forEach(playerId => {
      const stats = tournamentState.playerStats[playerId - 1];
      
      if (stats.lastPlayedRound === round - 1) {
        stats.consecutiveRounds++;
      } else {
        stats.consecutiveRounds = 1;
      }
      
      stats.matchesPlayed++;
      stats.lastPlayedRound = round;
      
      const teammates = match.filter(p => p !== playerId);
      const opponents = match.filter((_, idx) => idx >= 2);
      
      teammates.forEach(teammate => stats.partners.add(teammate));
      opponents.forEach(opponent => stats.opponents.add(opponent));
    });
  });
}

// ========== UI RENDERING ==========
function updateUIFromState() {
  document.getElementById('matchControl').style.display = 
    tournamentState.schedule.length > 0 ? 'block' : 'none';
  document.getElementById('scheduleContainer').style.display = 
    tournamentState.schedule.length > 0 ? 'block' : 'none';
  document.getElementById('statsSection').style.display = 
    tournamentState.schedule.length > 0 ? 'block' : 'none';
  
  const matchSelect = document.getElementById('matchSelect');
  matchSelect.innerHTML = '';
  tournamentState.schedule.forEach((_, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `Trận ${index + 1}`;
    matchSelect.appendChild(option);
  });
  matchSelect.value = tournamentState.currentMatchIndex;
}

function renderSchedule() {
  const scheduleTable = document.getElementById('scheduleTable');
  scheduleTable.innerHTML = '';
  
  const headerRow = document.createElement('tr');
  const headerCell = document.createElement('th');
  headerCell.textContent = 'Trận';
  headerRow.appendChild(headerCell);
  
  for (let i = 0; i < tournamentState.config.numCourts; i++) {
    const courtHeader = document.createElement('th');
    courtHeader.textContent = `Sân ${i + 1}`;
    headerRow.appendChild(courtHeader);
  }
  
  scheduleTable.appendChild(headerRow);
  
  tournamentState.schedule.forEach((round, roundIndex) => {
    const row = document.createElement('tr');
    row.className = roundIndex === tournamentState.currentMatchIndex ? 'current-match' : '';
    row.addEventListener('click', () => showMatchModal(roundIndex));
    
    const roundCell = document.createElement('td');
    roundCell.textContent = roundIndex + 1;
    row.appendChild(roundCell);
    
    round.forEach(match => {
      const matchCell = document.createElement('td');
      const matchBox = document.createElement('div');
      matchBox.className = 'match-box';
      matchBox.textContent = `${match[0]} & ${match[1]}\n${match[2]} & ${match[3]}`;
      matchCell.appendChild(matchBox);
      row.appendChild(matchCell);
    });
    
    scheduleTable.appendChild(row);
  });
}

function renderStatistics() {
  if (tournamentState.playerStats.length === 0) return;
  
  const matchesPlayed = tournamentState.playerStats.map(p => p.matchesPlayed);
  const minMatches = Math.min(...matchesPlayed);
  const maxMatches = Math.max(...matchesPlayed);
  const avgMatches = (matchesPlayed.reduce((a, b) => a + b, 0) / matchesPlayed.length).toFixed(1);
  const imbalance = maxMatches - minMatches;
  
  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-title">Số trận ít nhất</div>
      <div class="stat-value">${minMatches}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Số trận nhiều nhất</div>
      <div class="stat-value">${maxMatches}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Trung bình</div>
      <div class="stat-value">${avgMatches}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Chênh lệch</div>
      <div class="stat-value">${imbalance}</div>
    </div>
  `;
  
  const playerStatsTable = document.getElementById('playerStatsTable');
  playerStatsTable.innerHTML = `
    <tr>
      <th>Người chơi</th>
      <th>Số trận</th>
      <th>Lần cuối chơi</th>
      <th>Đồng đội khác nhau</th>
      <th>Đối thủ khác nhau</th>
    </tr>
  `;
  
  tournamentState.playerStats.forEach(player => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${player.id}</td>
      <td>${player.matchesPlayed}</td>
      <td>${player.lastPlayedRound === -1 ? 'Chưa chơi' : `Trận ${player.lastPlayedRound + 1}`}</td>
      <td>${player.partners.size}</td>
      <td>${player.opponents.size}</td>
    `;
    playerStatsTable.appendChild(row);
  });
}

// ========== MATCH NAVIGATION ==========
function showCurrentMatch() {
  showMatchModal(tournamentState.currentMatchIndex);
}

function showMatchModal(matchIndex) {
  tournamentState.currentMatchIndex = matchIndex;
  document.getElementById('modalTitle').textContent = `Trận ${matchIndex + 1}`;
  document.getElementById('matchSelect').value = matchIndex;
  
  const courtsContainer = document.getElementById('courtsContainer');
  courtsContainer.innerHTML = '';
  
  // Highlight current match in schedule
  const scheduleRows = document.querySelectorAll('#scheduleTable tr');
  scheduleRows.forEach((row, idx) => {
    if (idx === 0) return;
    row.className = idx - 1 === matchIndex ? 'current-match' : '';
  });

  // Create first row for court 1 & 2
  const row1 = document.createElement('div');
  row1.className = 'courts-row';
  
  // Create second row for court 3 & 4
  const row2 = document.createElement('div');
  row2.className = 'courts-row';

  // Create courts and add to appropriate rows
  tournamentState.schedule[matchIndex].forEach((match, courtIndex) => {
    const courtDiv = document.createElement('div');
    courtDiv.className = 'court';
    
    // Court title - bold
    const courtTitle = document.createElement('h4');
    courtTitle.className = 'court-title';
    courtTitle.textContent = `Sân ${courtIndex + 1}`;
    courtTitle.style.fontWeight = '700';
    courtDiv.appendChild(courtTitle);

    const teamsContainer = document.createElement('div');
    teamsContainer.className = 'teams-container';
    
    // Team A - bold label
    const teamA = document.createElement('div');
    teamA.className = 'team team-a';
    
    const teamALabel = document.createElement('div');
    teamALabel.className = 'team-label';
    teamALabel.textContent = 'ĐỘI A';
    teamALabel.style.fontWeight = '700';
    teamA.appendChild(teamALabel);
    
    // Team A players - semi-bold
    for (let i = 0; i < 2; i++) {
      const player = document.createElement('div');
      player.className = 'player team1';
      player.textContent = match[i];
      player.style.fontWeight = '600';
      player.dataset.court = courtIndex;
      player.dataset.position = i;
      player.draggable = true;
      
      player.addEventListener('dragstart', handleDragStart);
      player.addEventListener('dragover', handleDragOver);
      player.addEventListener('drop', handleDrop);
      player.addEventListener('dragend', handleDragEnd);
      
      teamA.appendChild(player);
    }
    
    // Team B - bold label
    const teamB = document.createElement('div');
    teamB.className = 'team team-b';
    
    const teamBLabel = document.createElement('div');
    teamBLabel.className = 'team-label';
    teamBLabel.textContent = 'ĐỘI B';
    teamBLabel.style.fontWeight = '700';
    teamB.appendChild(teamBLabel);
    
    // Team B players - semi-bold
    for (let i = 2; i < 4; i++) {
      const player = document.createElement('div');
      player.className = 'player team2';
      player.textContent = match[i];
      player.style.fontWeight = '600';
      player.dataset.court = courtIndex;
      player.dataset.position = i;
      player.draggable = true;
      
      player.addEventListener('dragstart', handleDragStart);
      player.addEventListener('dragover', handleDragOver);
      player.addEventListener('drop', handleDrop);
      player.addEventListener('dragend', handleDragEnd);
      
      teamB.appendChild(player);
    }
    
    teamsContainer.appendChild(teamA);
    teamsContainer.appendChild(teamB);
    courtDiv.appendChild(teamsContainer);

    // Add to appropriate row
    if (courtIndex < 2) {
      row1.appendChild(courtDiv);
    } else {
      row2.appendChild(courtDiv);
    }
  });

  // Add rows to container
  courtsContainer.appendChild(row1);
  courtsContainer.appendChild(row2);
  
  document.getElementById('matchModal').style.display = 'block';
  saveTournamentState();
}

// ========== DRAG AND DROP ==========
let draggedPlayer = null;

function handleDragStart(e) {
  draggedPlayer = e.target;
  e.dataTransfer.setData('text/plain', e.target.textContent);
  setTimeout(() => e.target.classList.add('dragging'), 0);
}

function handleDragOver(e) {
  e.preventDefault();
  if (e.target.classList.contains('player')) {
    e.target.classList.add('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  if (!e.target.classList.contains('player') || !draggedPlayer) return;
  
  e.target.classList.remove('drag-over');
  
  const sourceCourt = parseInt(draggedPlayer.dataset.court);
  const sourcePos = parseInt(draggedPlayer.dataset.position);
  const targetCourt = parseInt(e.target.dataset.court);
  const targetPos = parseInt(e.target.dataset.position);
  
  const temp = tournamentState.schedule[tournamentState.currentMatchIndex][sourceCourt][sourcePos];
  tournamentState.schedule[tournamentState.currentMatchIndex][sourceCourt][sourcePos] = 
    tournamentState.schedule[tournamentState.currentMatchIndex][targetCourt][targetPos];
  tournamentState.schedule[tournamentState.currentMatchIndex][targetCourt][targetPos] = temp;
  
  showMatchModal(tournamentState.currentMatchIndex);
  renderSchedule();
  saveTournamentState();
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.player').forEach(p => p.classList.remove('drag-over'));
  draggedPlayer = null;
}

function nextMatch() {
  if (tournamentState.currentMatchIndex < tournamentState.schedule.length - 1) {
    tournamentState.currentMatchIndex++;
    showMatchModal(tournamentState.currentMatchIndex);
  }
}

function prevMatch() {
  if (tournamentState.currentMatchIndex > 0) {
    tournamentState.currentMatchIndex--;
    showMatchModal(tournamentState.currentMatchIndex);
  }
}

function jumpToMatch(matchIndex) {
  tournamentState.currentMatchIndex = matchIndex;
  showMatchModal(matchIndex);
}

function closeModal() {
  document.getElementById('matchModal').style.display = 'none';
}

// ========== DATA MANAGEMENT ==========
function clearTournamentData() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?')) {
    tournamentState.schedule = [];
    tournamentState.playerStats = [];
    tournamentState.currentMatchIndex = 0;
    
    localStorage.removeItem('badmintonTournamentData');
    updateUIFromState();
  }
}
