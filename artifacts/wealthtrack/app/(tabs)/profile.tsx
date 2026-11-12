import { LedgerTools } from "@/components/LedgerTools";
import { validMoney, validDate, localDate } from "@/utils/financeValidation";
import { Feather } from "@expo/vector-icons";
import { useAccount } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";
import { pickProfilePhoto, removeOldProfilePhoto } from "@/utils/profilePhoto";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import { TrackingSettings } from "@/components/TrackingSettings";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  Button,
  Card,
  Divider,
  formatCurrency,
  Input,
  SectionHeader,
  StatCard,
} from "@/components/UI";

function ProfileScreen({
  user,
  signOut,
}: {
  user?: any;
  signOut: () => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const app = useApp();

  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(app.profile.name);
  const [username, setUsername] = useState(app.profile.username || "");
  const [monthly, setMonthly] = useState(app.profile.monthlySalary.toString());
  const [other, setOther] = useState(app.profile.otherIncome.toString());
  const [savings, setSavings] = useState(app.profile.currentSavings.toString());

  const save = () => {
    if (![monthly, other, savings].every((v) => validMoney(v, true, true))) {
      Alert.alert(
        "Check amounts",
        "Income and savings must be valid non-negative amounts.",
      );
      return;
    }
    app.updateProfile({
      name: name.trim() || app.profile.name,
      username: username
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, ""),
      monthlySalary: parseFloat(monthly) || 0,
      yearlySalary: (parseFloat(monthly) || 0) * 12,
      otherIncome: parseFloat(other) || 0,
      currentSavings: parseFloat(savings) || 0,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEdit(false);
  };

  const [photoBusy, setPhotoBusy] = useState(false);
  const pickPhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const uri = await pickProfilePhoto();
      if (uri) {
        const previousPhoto = app.profile.profilePhoto;
        app.updateProfile({ profilePhoto: uri });
        await app.exportData();
        await removeOldProfilePhoto(previousPhoto);
      }
    } catch (e) {
      Alert.alert(
        "Photo unavailable",
        e instanceof Error ? e.message : "Please choose another photo.",
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const resetOnboarding = () => {
    Alert.alert("Reset App", "This will clear all your data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          try {
            await app.resetData();
            router.replace("/onboarding");
          } catch (e) {
            Alert.alert(
              "Reset incomplete",
              e instanceof Error ? e.message : "Please try again.",
            );
          }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert(
              "Sign out failed",
              "Check your connection and try again.",
            );
          }
        },
      },
    ]);
  };

  const totalInvested =
    app.stocks.reduce((s, st) => s + st.quantity * st.buyPrice, 0) +
    app.cryptos.reduce((s, c) => s + c.quantity * c.buyPrice, 0) +
    app.goldSilver.reduce((s, g) => s + g.quantity * g.buyPrice, 0);

  const profilePhotoUri = app.profile.profilePhoto || user?.imageUrl;
  const displayName = app.profile.name || user?.fullName || "Your Name";
  const displayUsername = app.profile.username || user?.username || "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProFinancierHeader title="Profile" rightSlot={<TrackingSettings />} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 90 + (Platform.OS === "web" ? 34 : 0),
          paddingTop: Platform.OS === "web" ? 0 : 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Card
          style={{
            marginBottom: 20,
            alignItems: "center",
            paddingVertical: 28,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={photoBusy}
            onPress={pickPhoto}
            style={{ marginBottom: 12, opacity: photoBusy ? 0.5 : 1 }}
          >
            {profilePhotoUri ? (
              <Image
                source={{ uri: profilePhotoUri }}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  borderWidth: 3,
                  borderColor: colors.primary,
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: colors.primary + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: colors.primary + "40",
                }}
              >
                <Text style={{ fontSize: 34, color: colors.primary }}>
                  {displayName ? displayName[0].toUpperCase() : "P"}
                </Text>
              </View>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: colors.primary,
                borderRadius: 12,
                width: 24,
                height: 24,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.card,
              }}
            >
              <Feather name="camera" size={12} color="#fff" />
            </View>
          </Pressable>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
            }}
          >
            {displayName}
          </Text>
          {displayUsername ? (
            <Text
              style={{
                color: colors.primary,
                fontSize: 14,
                marginTop: 2,
                fontWeight: "600",
              }}
            >
              @{displayUsername}
            </Text>
          ) : null}
          {user?.emailAddresses?.[0]?.emailAddress ? (
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {user.emailAddresses[0].emailAddress}
            </Text>
          ) : null}
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {formatCurrency(app.profile.monthlySalary)}/month
          </Text>
          <Pressable
            onPress={() => {
              setName(app.profile.name);
              setUsername(app.profile.username || "");
              setMonthly(app.profile.monthlySalary.toString());
              setOther(app.profile.otherIncome.toString());
              setSavings(app.profile.currentSavings.toString());
              setShowEdit(true);
            }}
            style={{
              marginTop: 14,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: colors.secondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              Edit Profile
            </Text>
          </Pressable>
        </Card>

        {/* Financial summary */}
        <SectionHeader title="Financial Summary" />
        <View style={{ gap: 10, marginBottom: 20 }}>
          {[
            {
              label: "Monthly Income",
              value: app.totalIncome,
              icon: "dollar-sign",
              color: colors.income,
            },
            {
              label: "Total Expenses",
              value: app.totalExpenses,
              icon: "credit-card",
              color: colors.expense,
            },
            {
              label: "Total Savings",
              value: app.totalSavings,
              icon: "pocket",
              color: colors.savings,
            },
            {
              label: "Total Debt",
              value: app.totalDebt,
              icon: "alert-circle",
              color: colors.debt,
            },
            {
              label: "Net Worth",
              value: app.netWorth,
              icon: "bar-chart-2",
              color: colors.networth,
            },
          ].map((item) => (
            <Card key={item.label}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: item.color + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather
                      name={item.icon as any}
                      size={16}
                      color={item.color}
                    />
                  </View>
                  <Text style={{ fontSize: 15, color: colors.foreground }}>
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: item.color,
                    fontFamily: "Inter_700Bold",
                  }}
                >
                  {formatCurrency(item.value)}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Stats */}
        <SectionHeader title="Activity" />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Expenses logged",
              value: app.expenses.length,
              icon: "list",
            },
            { label: "Goals set", value: app.goals.length, icon: "target" },

            {
              label: "Debt entries",
              value: app.debts.length,
              icon: "alert-circle",
            },
            {
              label: "Bill groups",
              value: app.billGroups.length,
              icon: "users",
            },
          ].map((item) => (
            <Card
              key={item.label}
              style={{
                flex: 1,
                minWidth: 120,
                alignItems: "center",
                padding: 14,
              }}
            >
              <Feather
                name={item.icon as any}
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.foreground,
                  marginTop: 8,
                  fontFamily: "Inter_700Bold",
                }}
              >
                {item.value}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.mutedForeground,
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {item.label}
              </Text>
            </Card>
          ))}
        </View>

        {/* Settings */}
        <LedgerTools />
        <SectionHeader title="Settings" />
        <Card style={{ padding: 0 }}>
          {[
            {
              icon: "refresh-cw",
              label: "Reset all app data",
              onPress: resetOnboarding,
              color: colors.expense,
            },
            {
              icon: "log-out",
              label: user ? "Sign Out" : "Sign in with Google",
              onPress: user
                ? handleSignOut
                : () => router.push("/(auth)/sign-in"),
              color: colors.destructive,
            },
          ].map((item, i, arr) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                gap: 12,
              }}
            >
              <Feather name={item.icon as any} size={18} color={item.color} />
              <Text style={{ flex: 1, fontSize: 15, color: item.color }}>
                {item.label}
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          ))}
        </Card>

        <Text
          style={{
            textAlign: "center",
            color: colors.mutedForeground,
            fontSize: 12,
            marginTop: 24,
          }}
        >
          Pro Financier v1.0 · All data stored securely on your device
        </Text>

        {/* Edit Modal */}
        <Modal
          visible={showEdit}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEdit(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              padding: 24,
              paddingTop: Platform.OS === "ios" ? 40 : 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                }}
              >
                Edit Profile
              </Text>
              <Pressable onPress={() => setShowEdit(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. rahul_sharma"
              />
              <Input
                label="Monthly Salary"
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="decimal-pad"
                prefix="₹"
                placeholder="50000"
              />
              <Input
                label="Other Monthly Income"
                value={other}
                onChangeText={setOther}
                keyboardType="decimal-pad"
                prefix="₹"
                placeholder="Freelance, side gigs"
              />
              <Input
                label="Current Savings"
                value={savings}
                onChangeText={setSavings}
                keyboardType="decimal-pad"
                prefix="₹"
                placeholder="100000"
              />
              <View style={{ height: 24 }} />
              <Button title="Save Changes" onPress={save} />
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});

export default function ProfileEntry() {
  const account = useAccount();
  const u = account.session?.user;
  const user = u
    ? {
        fullName: u.user_metadata.full_name,
        imageUrl: u.user_metadata.avatar_url,
        emailAddresses: [{ emailAddress: u.email }],
      }
    : undefined;
  return (
    <ProfileScreen
      user={user}
      signOut={async () => {
        if (u) await account.signOut();
        else router.push("/(auth)/sign-in");
      }}
    />
  );
}
