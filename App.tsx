// ============================================================================
// ShiftNote AU Mobile - Main Application Entrypoint
// React Native + Expo Native App for Australian Independent Support Workers
// ============================================================================

import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { Mic, Users, FileCheck2 } from "lucide-react-native";
import { VoiceRecordingScreen } from "./src/screens/VoiceRecordingScreen";
import { ParticipantsScreen } from "./src/screens/ParticipantsScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";

type TabKey = "voice" | "participants" | "history";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("voice");

  const handleTabPress = (tab: TabKey) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="light" />

        {/* Active Screen */}
        <View style={styles.screenContainer}>
          {activeTab === "voice" && <VoiceRecordingScreen />}
          {activeTab === "participants" && <ParticipantsScreen />}
          {activeTab === "history" && <HistoryScreen />}
        </View>

        {/* ── NATIVE BOTTOM TAB BAR ──────────────────────────────── */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "voice" && styles.tabButtonActive]}
              onPress={() => handleTabPress("voice")}
            >
              <Mic
                size={22}
                color={activeTab === "voice" ? "#2DD4BF" : "#64748B"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === "voice" ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                Voice & Claim
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "participants" && styles.tabButtonActive]}
              onPress={() => handleTabPress("participants")}
            >
              <Users
                size={22}
                color={activeTab === "participants" ? "#2DD4BF" : "#64748B"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === "participants" ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                Participants
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
              onPress={() => handleTabPress("history")}
            >
              <FileCheck2
                size={22}
                color={activeTab === "history" ? "#2DD4BF" : "#64748B"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === "history" ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                Audit History
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050A18",
  },
  screenContainer: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: "rgba(5, 10, 24, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  tabButtonActive: {},
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#2DD4BF",
  },
  tabLabelInactive: {
    color: "#64748B",
  },
});

