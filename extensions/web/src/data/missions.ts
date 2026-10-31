/**
 * The 7 restoration missions. Each recovers one Ship_Component from a Guardian_Boss and installs
 * it at an Install_Point in a thematically fitting room. Missions are pure data; `core/missions.ts`
 * tracks their runtime status and `core/story.ts` tracks overall arc progress.
 *
 * Key gating (see data/world.ts): some install rooms sit behind a Key_Card. Keys are placed so
 * the chain is always solvable from the start (no key gates the room that contains it).
 */

/** A ship component recovered and then installed to restore the ship. */
export interface MissionSeed {
  /** Stable id (also the component id). */
  id: string;
  /** Player-facing mission name. */
  name: string;
  /** Short objective line for the HUD. */
  objective: string;
  /** The component's display name. */
  componentName: string;
  /** The guardian boss (in data/bosses.ts) that drops this component. */
  guardianBossId: string;
  /** The room where this component is recovered (the guardian's room). */
  guardianRoomKey: string;
  /** The room holding the Install_Point for this component. */
  installRoomKey: string;
}

/**
 * Seven missions. The components are the recognizable systems of a ship: power, navigation,
 * life support, comms, propulsion, shielding, and the flight computer. Install rooms match
 * their function (reactor core → Reactor Terminal, nav → Observation Deck, etc.).
 */
export const MISSIONS: MissionSeed[] = [
  {
    id: 'reactor-core',
    name: 'Restore Power',
    objective: 'Recover the reactor core and install it in the Reactor Terminal.',
    componentName: 'Reactor Core',
    guardianBossId: 'guardian-sentinel',
    guardianRoomKey: 'Storage Hub',
    installRoomKey: 'Reactor Terminal',
  },
  {
    id: 'nav-array',
    name: 'Fix Navigation',
    objective: 'Recover the navigation array and install it on the Observation Deck.',
    componentName: 'Navigation Array',
    guardianBossId: 'guardian-watcher',
    guardianRoomKey: 'Data Core',
    installRoomKey: 'Observation Deck',
  },
  {
    id: 'life-support',
    name: 'Seal Life Support',
    objective: 'Recover the life-support unit and install it in the Repair Bay.',
    componentName: 'Life-Support Unit',
    guardianBossId: 'guardian-warden',
    guardianRoomKey: 'Maintenance Shaft',
    installRoomKey: 'Repair Bay',
  },
  {
    id: 'comms-relay',
    name: 'Reopen Comms',
    objective: 'Recover the comms relay and install it in the Communications Array.',
    componentName: 'Comms Relay',
    guardianBossId: 'guardian-breaker',
    guardianRoomKey: 'Breached Lab',
    installRoomKey: 'Communications Array',
  },
  {
    id: 'thruster-assembly',
    name: 'Mount Thrusters',
    objective: 'Recover the thruster assembly and install it at the Docking Port.',
    componentName: 'Thruster Assembly',
    guardianBossId: 'guardian-hauler',
    guardianRoomKey: 'Cargo Wreck',
    installRoomKey: 'Docking Port',
  },
  {
    id: 'shield-emitter',
    name: 'Raise Shields',
    objective: 'Recover the shield emitter and install it in the Crew Remnants bay.',
    componentName: 'Shield Emitter',
    guardianBossId: 'guardian-bastion',
    guardianRoomKey: 'Debris Drift',
    installRoomKey: 'Crew Remnants',
  },
  {
    id: 'flight-computer',
    name: 'Boot the Flight Computer',
    objective: 'Recover the flight computer and install it in the Airlock control.',
    componentName: 'Flight Computer',
    guardianBossId: 'guardian-cipher',
    guardianRoomKey: 'Collapsed Corridor',
    installRoomKey: 'Airlock',
  },
];

/** Look up a mission (and thus component) by id. */
export function missionById(id: string): MissionSeed | undefined {
  return MISSIONS.find((m) => m.id === id);
}
