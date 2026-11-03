// ============================================================================
// ShiftNote AU Mobile - Voice & Claim Screen
// Native post-shift voice recording, haptic feedback, and instant GST-free claims
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  Share2,
  FileText,
  Shield,
  Volume2,
  Clock,
  Car,
  ChevronRight,
} from "lucide-react-native";
import {
  DEMO_PARTICIPANTS,
  DEMO_WORKER_PROFILE,
  SAMPLE_VOICE_TRANSCRIPTS,
} from "../lib/demo-data";
import {
  getDemoModeEnabled,
  getStoredParticipants,
  getStoredWorkerProfile,
  setDemoModeEnabled,
  upsertStoredShift,
} from "../lib/mobile-store";
import { processMobileVoiceNote } from "../lib/mobile-voice-engine";
import { generateAndShareMobileInvoice } from "../lib/mobile-pdf";
import { formatInvoiceReference } from "../lib/ndis-catalogue";
import type { Participant, ShiftAndClaim, WorkerProfile } from "../lib/types";

const { width } = Dimensions.get("window");

export function VoiceRecordingScreen() {
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [worker, setWorker] = useState<WorkerProfile>(DEMO_WORKER_PROFILE);
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    DEMO_PARTICIPANTS[0]!.id
  );

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDurationSecs, setRecordingDurationSecs] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeClaim, setActiveClaim] = useState<ShiftAndClaim | null>(null);
  const [sharingPdf, setSharingPdf] = useState<boolean>(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const mode = await getDemoModeEnabled();
      setDemoMode(mode);
      const w = await getStoredWorkerProfile();
      setWorker(w);
      const p = await getStoredParticipants();
      setParticipants(p);
      if (p.length > 0) setSelectedParticipantId(p[0]!.id);
    })();
  }, []);

  const selectedParticipant =
    participants.find((p) => p.id === selectedParticipantId) ??
    participants[0] ??
    DEMO_PARTICIPANTS[0]!;

  const handleToggleDemoMode = async () => {
    Haptics.selectionAsync();
    const next = !demoMode;
    setDemoMode(next);
    await setDemoModeEnabled(next);
  };

  const startRecording = async () => {
    if (isRecording || isProcessing) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Microphone access is needed to record voice notes.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDurationSecs(0);

      timerRef.current = setInterval(() => {
        setRecordingDurationSecs((prev) => prev + 1);
      }, 1000);
    } catch {
      // In simulator or fallback, use simulated flow
      simulateVoiceNote();
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        setIsRecording(false);
        await processAudio(uri || undefined);
      } else {
        setIsRecording(false);
      }
    } catch {
      setIsRecording(false);
      simulateVoiceNote();
    }
  };

  const processAudio = async (uri?: string, transcriptOverride?: string) => {
    setIsProcessing(true);
    try {
      const claim = await processMobileVoiceNote({
        participant: selectedParticipant,
        worker,
        audioUri: uri,
        transcriptOverride:
          transcriptOverride ||
          SAMPLE_VOICE_TRANSCRIPTS[selectedParticipant.id] ||
          SAMPLE_VOICE_TRANSCRIPTS["11111111-1111-4111-8111-111111111101"]!,
      });
      await upsertStoredShift(claim);
      setActiveClaim(claim);
    } catch (err) {
      Alert.alert("Extraction Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateVoiceNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const transcript =
      SAMPLE_VOICE_TRANSCRIPTS[selectedParticipant.id] ||
      SAMPLE_VOICE_TRANSCRIPTS["11111111-1111-4111-8111-111111111101"]!;
    processAudio(undefined, transcript);
  };

  const handleSharePdf = async () => {
    if (!activeClaim) return;
    Haptics.selectionAsync();
    setSharingPdf(true);
    try {
      await generateAndShareMobileInvoice({
        claim: activeClaim,
        participant: selectedParticipant,
        worker,
      });
    } catch (err) {
      Alert.alert("Share Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setSharingPdf(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── TOP HEADER ────────────────────────────────────────────── */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <View style={styles.liveIndicator} />
            <Text style={styles.brandTitle}>ShiftNote AU</Text>
            <View style={styles.gstPill}>
              <Text style={styles.gstPillText}>GST-FREE</Text>
            </View>
          </View>
          <Text style={styles.workerSub}>
            {worker.business_name} · ABN {worker.abn}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.demoToggle, demoMode ? styles.demoToggleActive : styles.demoToggleInactive]}
          onPress={handleToggleDemoMode}
        >
          <Sparkles size={12} color={demoMode ? "#FCD34D" : "#94A3B8"} />
          <Text style={[styles.demoToggleText, demoMode ? styles.textAmber : styles.textSlate]}>
            {demoMode ? "Demo ON" : "Demo OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── PARTICIPANT SELECTION ─────────────────────────────────── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>1. NDIS Participant</Text>
          <Text style={styles.ndisNumTag}>NDIS# {selectedParticipant.ndis_number}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
          {participants.map((p) => {
            const isSelected = p.id === selectedParticipant.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedParticipantId(p.id);
                }}
                style={[styles.participantPill, isSelected && styles.participantPillActive]}
              >
                <Text
                  style={[
                    styles.participantPillText,
                    isSelected ? styles.textTealLight : styles.textSlateLight,
                  ]}
                >
                  {p.full_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.participantMetaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>
              Plan Manager: <Text style={styles.metaValue}>{selectedParticipant.plan_manager_name || "Self-Managed"}</Text>
            </Text>
            <View style={styles.fundingBadge}>
              <Text style={styles.fundingBadgeText}>
                {selectedParticipant.funding_type.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
          <Text style={styles.goalsText} numberOfLines={2}>
            <Text style={styles.goalsBold}>Goals: </Text>
            {selectedParticipant.ndis_goals_summary}
          </Text>
        </View>
      </View>

      {/* ── RECORDING HUB ─────────────────────────────────────────── */}
      <View style={styles.recordingCard}>
        <Text style={styles.recordHeader}>2. Post-Shift Voice Dictation</Text>
        <Text style={styles.recordSub}>Hold button · Dictate hours, activities, and travel KMs</Text>

        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, isRecording && styles.timerTextRecording]}>
            {isRecording
              ? `● REC ${formatTimer(recordingDurationSecs)}`
              : isProcessing
                ? "◌ Extracting NDIS Claim..."
                : "○ 00:00 READY"}
          </Text>
        </View>

        {/* Big Hold-to-Speak Trigger */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessing}
          style={[
            styles.micButton,
            isRecording ? styles.micButtonRecording : styles.micButtonIdle,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : isRecording ? (
            <Square size={36} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={42} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        <Text style={styles.buttonHint}>
          {isRecording ? "Release to generate clinical case note & invoice" : "Hold to Speak"}
        </Text>

        {demoMode && (
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={simulateVoiceNote}
            disabled={isProcessing || isRecording}
          >
            <Volume2 size={16} color="#FCD34D" />
            <Text style={styles.simulateButtonText}>
              Simulate Post-Shift Voice ({selectedParticipant.full_name})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── LIVE EXTRACTION RESULTS ───────────────────────────────── */}
      {activeClaim && (
        <View style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <View>
              <Text style={styles.claimTitle}>Generated NDIS Claim</Text>
              <Text style={styles.invoiceNumText}>{activeClaim.invoice_number}</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>${activeClaim.total_amount.toFixed(2)} AUD</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Clock size={14} color="#0D9488" />
              <Text style={styles.metricText}>
                {activeClaim.duration_hours}h ({activeClaim.start_time}–{activeClaim.end_time})
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Car size={14} color="#0D9488" />
              <Text style={styles.metricText}>{activeClaim.km_travelled} km travel</Text>
            </View>
          </View>

          {/* 3-Part Clinical Notes */}
          <View style={styles.caseNotesSection}>
            <Text style={styles.caseNotesHeader}>NDIS Commission 3-Part Clinical Case Note</Text>

            <View style={styles.caseNoteBlock}>
              <Text style={styles.noteFieldTitle}>1. Activities Delivered</Text>
              <Text style={styles.noteBodyText}>{activeClaim.case_note_activities}</Text>
            </View>

            <View style={styles.caseNoteBlock}>
              <Text style={styles.noteFieldTitle}>2. Participant Engagement</Text>
              <Text style={styles.noteBodyText}>{activeClaim.case_note_engagement}</Text>
            </View>

            <View style={styles.caseNoteBlock}>
              <Text style={styles.noteFieldTitle}>3. NDIS Plan Goals Progress</Text>
              <Text style={styles.noteBodyText}>{activeClaim.case_note_goals}</Text>
            </View>
          </View>

          {/* Line items table */}
          <View style={styles.lineItemsSection}>
            <Text style={styles.lineItemsHeader}>NDIS Line Items (Rate Capped)</Text>
            {activeClaim.line_items.map((item, idx) => (
              <View key={idx} style={styles.lineItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemCode}>{item.ndis_code}</Text>
                  <Text style={styles.lineItemDesc} numberOfLines={1}>
                    {item.support_name}
                  </Text>
                </View>
                <View style={styles.lineItemPriceCol}>
                  <Text style={styles.lineItemPrice}>${item.line_total.toFixed(2)}</Text>
                  <Text style={styles.gstTag}>EXEMPTOUTPUT</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action button: Share PDF */}
          <TouchableOpacity
            style={styles.sharePdfButton}
            onPress={handleSharePdf}
            disabled={sharingPdf}
          >
            {sharingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.sharePdfText}>Share ATO Tax Invoice PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

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
    paddingTop: 10,
    gap: 14,
  },
  headerCard: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2DD4BF",
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  gstPill: {
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.25)",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  gstPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#5EEAD4",
    letterSpacing: 0.5,
  },
  workerSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },
  demoToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  demoToggleActive: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  demoToggleInactive: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  demoToggleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textAmber: { color: "#FCD34D" },
  textSlate: { color: "#94A3B8" },
  textTealLight: { color: "#5EEAD4" },
  textSlateLight: { color: "#CBD5E1" },

  sectionCard: {
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#E2E8F0",
  },
  ndisNumTag: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#5EEAD4",
  },
  pillsScroll: {
    flexDirection: "row",
  },
  participantPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    marginRight: 8,
  },
  participantPillActive: {
    backgroundColor: "rgba(13, 148, 136, 0.2)",
    borderColor: "rgba(20, 184, 166, 0.5)",
  },
  participantPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  participantMetaCard: {
    backgroundColor: "rgba(2, 6, 23, 0.45)",
    borderRadius: 16,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.08)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },
  metaValue: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  fundingBadge: {
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fundingBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#5EEAD4",
    textTransform: "uppercase",
  },
  goalsText: {
    fontSize: 11,
    color: "#CBD5E1",
    lineHeight: 16,
  },
  goalsBold: {
    fontWeight: "700",
    color: "#2DD4BF",
  },

  recordingCard: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  recordHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  recordSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  timerContainer: {
    marginVertical: 4,
  },
  timerText: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },
  timerTextRecording: {
    color: "#F87171",
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    marginVertical: 8,
  },
  micButtonIdle: {
    backgroundColor: "#0D9488",
    borderColor: "rgba(45, 212, 191, 0.4)",
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  micButtonRecording: {
    backgroundColor: "#E11D48",
    borderColor: "rgba(244, 63, 94, 0.6)",
    transform: [{ scale: 1.08 }],
  },
  buttonHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  simulateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  simulateButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FCD34D",
  },

  claimCard: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  claimTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  invoiceNumText: {
    fontSize: 11,
    color: "#5EEAD4",
    fontFamily: "monospace",
    fontWeight: "700",
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: "rgba(13, 148, 136, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#5EEAD4",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  caseNotesSection: {
    gap: 8,
  },
  caseNotesHeader: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  caseNoteBlock: {
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  noteFieldTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#5EEAD4",
    textTransform: "uppercase",
  },
  noteBodyText: {
    fontSize: 11,
    color: "#CBD5E1",
    lineHeight: 16,
  },
  lineItemsSection: {
    gap: 8,
    paddingTop: 4,
  },
  lineItemsHeader: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  lineItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  lineItemCode: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#5EEAD4",
  },
  lineItemDesc: {
    fontSize: 10,
    color: "#94A3B8",
  },
  lineItemPriceCol: {
    alignItems: "flex-end",
  },
  lineItemPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  gstTag: {
    fontSize: 8,
    fontFamily: "monospace",
    color: "#5EEAD4",
  },
  sharePdfButton: {
    backgroundColor: "#0D9488",
    borderRadius: 18,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sharePdfText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
