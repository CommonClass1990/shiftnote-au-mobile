// ============================================================================
// ShiftNote AU Mobile - Audit & Claims History Screen
// NDIS Commission compliance audit records and instant PDF export
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  FileCheck2,
  Share2,
  TrendingUp,
  Clock,
  Car,
  CheckCircle2,
} from "lucide-react-native";
import {
  DEMO_INITIAL_SHIFTS,
  DEMO_PARTICIPANTS,
  DEMO_WORKER_PROFILE,
} from "../lib/demo-data";
import {
  getStoredParticipants,
  getStoredShifts,
  getStoredWorkerProfile,
} from "../lib/mobile-store";
import { generateAndShareMobileInvoice } from "../lib/mobile-pdf";
import type { Participant, ShiftAndClaim, WorkerProfile } from "../lib/types";

export function HistoryScreen() {
  const [shifts, setShifts] = useState<ShiftAndClaim[]>(DEMO_INITIAL_SHIFTS);
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS);
  const [worker, setWorker] = useState<WorkerProfile>(DEMO_WORKER_PROFILE);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getStoredShifts();
      setShifts(s);
      const p = await getStoredParticipants();
      setParticipants(p);
      const w = await getStoredWorkerProfile();
      setWorker(w);
    })();
  }, []);

  const totalAud = shifts.reduce((sum, s) => sum + s.total_amount, 0);

  const getParticipant = (id: string): Participant =>
    participants.find((p) => p.id === id) ?? DEMO_PARTICIPANTS[0]!;

  const handleShareShift = async (shift: ShiftAndClaim) => {
    Haptics.selectionAsync();
    setSharingId(shift.id);
    try {
      const p = getParticipant(shift.participant_id);
      await generateAndShareMobileInvoice({
        claim: shift,
        participant: p,
        worker,
      });
    } catch (err) {
      Alert.alert("Error Sharing PDF", err instanceof Error ? err.message : String(err));
    } finally {
      setSharingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── SUMMARY STATS ─────────────────────────────────────────── */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statsTitle}>NDIS Audit & Claims History</Text>
            <Text style={styles.statsSub}>{shifts.length} Recorded Shifts</Text>
          </View>
          <View style={styles.audTag}>
            <TrendingUp size={14} color="#5EEAD4" />
            <Text style={styles.audTagText}>${totalAud.toFixed(2)} AUD</Text>
          </View>
        </View>
        <Text style={styles.gstNotice}>
          All amounts 100% Australian GST-Free (s38-38 NDIS Supply)
        </Text>
      </View>

      {/* ── SHIFT LIST ────────────────────────────────────────────── */}
      <View style={styles.shiftsList}>
        {shifts.map((s) => {
          const participant = getParticipant(s.participant_id);
          const isSharing = sharingId === s.id;
          return (
            <View key={s.id} style={styles.shiftCard}>
              <View style={styles.shiftTop}>
                <View>
                  <Text style={styles.shiftDate}>{s.shift_date}</Text>
                  <Text style={styles.shiftParticipant}>{participant.full_name}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {s.status.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Clock size={12} color="#0D9488" />
                  <Text style={styles.metricText}>
                    {s.duration_hours}h ({s.start_time}–{s.end_time})
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Car size={12} color="#0D9488" />
                  <Text style={styles.metricText}>{s.km_travelled} km</Text>
                </View>
              </View>

              <View style={styles.caseNotePreview}>
                <Text style={styles.caseNoteText} numberOfLines={2}>
                  {s.case_note_activities}
                </Text>
              </View>

              <View style={styles.shiftFooter}>
                <View>
                  <Text style={styles.invoiceNumber}>{s.invoice_number}</Text>
                  <Text style={styles.totalAmount}>${s.total_amount.toFixed(2)} AUD</Text>
                </View>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => handleShareShift(s)}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Share2 size={13} color="#FFFFFF" />
                      <Text style={styles.shareButtonText}>Share PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050A18",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  statsCard: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 22,
    padding: 16,
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  statsSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  audTag: {
    backgroundColor: "rgba(13, 148, 136, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  audTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5EEAD4",
  },
  gstNotice: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  shiftsList: {
    gap: 12,
  },
  shiftCard: {
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  shiftTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shiftDate: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#5EEAD4",
    fontWeight: "700",
  },
  shiftParticipant: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#5EEAD4",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 14,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  caseNotePreview: {
    backgroundColor: "rgba(2, 6, 23, 0.4)",
    borderRadius: 10,
    padding: 8,
  },
  caseNoteText: {
    fontSize: 10.5,
    color: "#CBD5E1",
    lineHeight: 15,
  },
  shiftFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.08)",
  },
  invoiceNumber: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#64748B",
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 1,
  },
  shareButton: {
    backgroundColor: "#0D9488",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  shareButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

