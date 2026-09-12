export interface TeamInput {
  id: string;
  track?: string;
  // any other constraints
}

export interface JudgeInput {
  id: string;
  currentWorkload: number; // number of assignments they already have across all rounds or this round
  capacity?: number; // max they can take
  tracks?: string[]; // tracks they are allowed to judge (empty = all)
}

export interface AssignmentResult {
  teamId: string;
  judgeId: string;
}

export interface AssignmentConfig {
  judgesPerTeam: number;
  strategy: 'balanced' | 'random';
  keepExisting: boolean;
}

export interface ExistingAssignment {
  teamId: string;
  judgeId: string;
  status?: string;
}

/**
 * Deterministically distributes teams to judges based on workload and constraints.
 */
export function calculateBalancedAssignments(
  teams: TeamInput[],
  judges: JudgeInput[],
  existingAssignments: ExistingAssignment[],
  config: AssignmentConfig
): AssignmentResult[] {
  const newAssignments: AssignmentResult[] = [];
  
  // Track workloads in memory to update as we assign
  const judgeWorkloads = new Map<string, number>();
  judges.forEach(j => judgeWorkloads.set(j.id, j.currentWorkload || 0));

  // Determine existing active coverage per team
  const activeExisting = existingAssignments.filter(a => a.status !== 'REMOVED');
  
  // We sort teams to ensure deterministic assignment
  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));

  for (const team of sortedTeams) {
    // How many judges does this team currently have?
    const existingForTeam = activeExisting.filter(a => a.teamId === team.id);
    
    // If keepExisting is false, we ignore them (they will be marked as REMOVED by caller).
    // If keepExisting is true, we count them towards coverage.
    let currentCoverage = config.keepExisting ? existingForTeam.length : 0;
    const assignedJudgesForThisTeam = new Set<string>();
    
    if (config.keepExisting) {
      existingForTeam.forEach(e => assignedJudgesForThisTeam.add(e.judgeId));
    }

    while (currentCoverage < config.judgesPerTeam) {
      // Find the best judge for this team
      const eligibleJudges = judges.filter(j => {
        // Can't assign same judge twice to same team
        if (assignedJudgesForThisTeam.has(j.id)) return false;
        
        // Track restriction
        if (j.tracks && j.tracks.length > 0 && team.track) {
          if (!j.tracks.includes(team.track)) return false;
        }

        // Capacity
        const load = judgeWorkloads.get(j.id) || 0;
        if (j.capacity && load >= j.capacity) return false;

        return true;
      });

      if (eligibleJudges.length === 0) {
        // No eligible judge found for this team to fulfill the coverage
        break;
      }

      // Sort eligible judges primarily by current workload (ascending)
      // Then deterministically by ID to break ties
      eligibleJudges.sort((a, b) => {
        const loadA = judgeWorkloads.get(a.id) || 0;
        const loadB = judgeWorkloads.get(b.id) || 0;
        if (loadA !== loadB) return loadA - loadB;
        if (config.strategy === 'random') {
          return Math.random() - 0.5; // Only if random strategy explicitly requested
        }
        return a.id.localeCompare(b.id);
      });

      const selectedJudge = eligibleJudges[0];
      
      newAssignments.push({
        teamId: team.id,
        judgeId: selectedJudge.id
      });
      
      assignedJudgesForThisTeam.add(selectedJudge.id);
      judgeWorkloads.set(selectedJudge.id, (judgeWorkloads.get(selectedJudge.id) || 0) + 1);
      currentCoverage++;
    }
  }

  return newAssignments;
}
