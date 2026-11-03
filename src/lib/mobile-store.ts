// ============================================================================
// ShiftNote AU Mobile - Offline-First Local Storage Engine
// Uses @react-native-async-storage/async-storage for zero-connection reliability
// ============================================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEMO_INITIAL_SHIFTS,
  DEMO_PARTICIPANTS,
  DEMO_WORKER_PROFILE,
} from "./demo-data";
import type { Participant, ShiftAndClaim, WorkerProfile } from "./types";

const KEYS = {
  WORKER_PROFILE: "@shiftnote_worker_profile",
  PARTICIPANTS: "@shiftnote_participants",
  SHIFTS: "@shiftnote_shifts",
  DEMO_MODE: "@shiftnote_demo_mode",
};

export async function getStoredWorkerProfile(): Promise<WorkerProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WORKER_PROFILE);
    if (!raw) return DEMO_WORKER_PROFILE;
    return JSON.parse(raw) as WorkerProfile;
  } catch {
    return DEMO_WORKER_PROFILE;
  }
}

export async function saveStoredWorkerProfile(profile: WorkerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.WORKER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error("Failed to save worker profile", err);
  }
}

export async function getStoredParticipants(): Promise<Participant[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PARTICIPANTS);
    if (!raw) return DEMO_PARTICIPANTS;
    return JSON.parse(raw) as Participant[];
  } catch {
    return DEMO_PARTICIPANTS;
  }
}

export async function saveStoredParticipants(participants: Participant[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PARTICIPANTS, JSON.stringify(participants));
  } catch (err) {
    console.error("Failed to save participants", err);
  }
}

export async function getStoredShifts(): Promise<ShiftAndClaim[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SHIFTS);
    if (!raw) return DEMO_INITIAL_SHIFTS;
    return JSON.parse(raw) as ShiftAndClaim[];
  } catch {
    return DEMO_INITIAL_SHIFTS;
  }
}

export async function upsertStoredShift(shift: ShiftAndClaim): Promise<ShiftAndClaim[]> {
  const existing = await getStoredShifts();
  const index = existing.findIndex((s) => s.id === shift.id);
  const updated =
    index >= 0
      ? existing.map((s, idx) => (idx === index ? shift : s))
      : [shift, ...existing];
  try {
    await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to upsert shift", err);
  }
  return updated;
}

export async function getDemoModeEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.DEMO_MODE);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export async function setDemoModeEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DEMO_MODE, enabled ? "true" : "false");
  } catch (err) {
    console.error("Failed to save demo mode state", err);
  }
}
