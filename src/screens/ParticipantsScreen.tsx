// ============================================================================
// ShiftNote AU Mobile - Participants Screen
// NDIS Participant directory with plan manager details and goal management
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { UserPlus, Users, X, Check, Target, Mail } from "lucide-react-native";
import { DEMO_PARTICIPANTS, DEMO_WORKER_PROFILE } from "../lib/demo-data";
import { getStoredParticipants, saveStoredParticipants } from "../lib/mobile-store";
import type { FundingType, Participant } from "../lib/types";

export function ParticipantsScreen() {
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [ndisNumber, setNdisNumber] = useState("");
  const [fundingType, setFundingType] = useState<FundingType>("plan_managed");
  const [planManagerName, setPlanManagerName] = useState("");
  const [planManagerEmail, setPlanManagerEmail] = useState("");
  const [goalsSummary, setGoalsSummary] = useState("");

  useEffect(() => {
    (async () => {
      const p = await getStoredParticipants();
      setParticipants(p);
    })();
  }, []);

  const handleAddParticipant = async () => {
    const cleanNdis = ndisNumber.replace(/\D/g, "").slice(0, 9);
    if (!fullName.trim() || cleanNdis.length !== 9) {
      Alert.alert("Invalid Input", "Please enter a valid full name and a 9-digit NDIS number.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newP: Participant = {
      id: `mobile-part-${Date.now()}`,
      worker_id: DEMO_WORKER_PROFILE.id,
      full_name: fullName.trim(),
      ndis_number: cleanNdis,
      funding_type: fundingType,
      plan_manager_name: planManagerName.trim() || null,
      plan_manager_email: planManagerEmail.trim() || null,
      xero_contact_id: null,
      ndis_goals_summary:
        goalsSummary.trim() ||
        "Build daily living independence and community social participation.",
    };

    const updated = [newP, ...participants];
    setParticipants(updated);
    await saveStoredParticipants(updated);

    setFullName("");
    setNdisNumber("");
    setPlanManagerName("");
    setPlanManagerEmail("");
    setGoalsSummary("");
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>NDIS Participants</Text>
          <Text style={styles.headerSub}>{participants.length} Active Participants</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {participants.map((p) => (
          <View key={p.id} style={styles.participantCard}>
            <View style={styles.cardTopRow}>
              <View>
                <Text style={styles.participantName}>{p.full_name}</Text>
                <Text style={styles.ndisTag}>NDIS# {p.ndis_number}</Text>
              </View>
              <View style={styles.fundingBadge}>
                <Text style={styles.fundingBadgeText}>
                  {p.funding_type.replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Mail size={12} color="#0D9488" />
              <Text style={styles.detailText}>
                {p.plan_manager_name || "Self-Managed"}{" "}
                {p.plan_manager_email ? `(${p.plan_manager_email})` : ""}
              </Text>
            </View>

            <View style={styles.goalsBox}>
              <View style={styles.goalsTitleRow}>
                <Target size={12} color="#FCD34D" />
                <Text style={styles.goalsLabel}>Active NDIS Plan Goals</Text>
              </View>
              <Text style={styles.goalsContent}>{p.ndis_goals_summary}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── ADD PARTICIPANT MODAL ──────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add NDIS Participant</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Liam Davies"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>9-Digit NDIS Number</Text>
              <TextInput
                style={styles.input}
                placeholder="430123456"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={9}
                value={ndisNumber}
                onChangeText={setNdisNumber}
              />

              <Text style={styles.inputLabel}>Funding Type</Text>
              <View style={styles.fundingOptions}>
                {(["plan_managed", "self_managed", "ndia_managed"] as FundingType[]).map((ft) => (
                  <TouchableOpacity
                    key={ft}
                    onPress={() => setFundingType(ft)}
                    style={[
                      styles.fundingOption,
                      fundingType === ft && styles.fundingOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.fundingOptionText,
                        fundingType === ft && styles.fundingOptionTextActive,
                      ]}
                    >
                      {ft.replace(/_/g, " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Plan Manager Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MyIntegra Plan Management"
                placeholderTextColor="#64748B"
                value={planManagerName}
                onChangeText={setPlanManagerName}
              />

              <Text style={styles.inputLabel}>Plan Manager Claims Email</Text>
              <TextInput
                style={styles.input}
                placeholder="claims@planmanager.com.au"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={planManagerEmail}
                onChangeText={setPlanManagerEmail}
              />

              <Text style={styles.inputLabel}>NDIS Plan Goals Summary</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Describe key goals (grocery budgeting, community access, etc.)"
                placeholderTextColor="#64748B"
                multiline
                value={goalsSummary}
                onChangeText={setGoalsSummary}
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleAddParticipant}>
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Participant</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050A18",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#0D9488",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    gap: 12,
    paddingBottom: 40,
  },
  participantCard: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  participantName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  ndisTag: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#5EEAD4",
    marginTop: 2,
  },
  fundingBadge: {
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  fundingBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#5EEAD4",
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: "#CBD5E1",
  },
  goalsBox: {
    backgroundColor: "rgba(2, 6, 23, 0.45)",
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  goalsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  goalsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FCD34D",
    textTransform: "uppercase",
  },
  goalsContent: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0A1024",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalForm: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#CBD5E1",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 12,
  },
  fundingOptions: {
    flexDirection: "row",
    gap: 8,
  },
  fundingOption: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  fundingOptionActive: {
    backgroundColor: "rgba(13, 148, 136, 0.2)",
    borderColor: "rgba(20, 184, 166, 0.4)",
  },
  fundingOptionText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "capitalize",
  },
  fundingOptionTextActive: {
    color: "#5EEAD4",
    fontWeight: "800",
  },
  saveButton: {
    backgroundColor: "#0D9488",
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
