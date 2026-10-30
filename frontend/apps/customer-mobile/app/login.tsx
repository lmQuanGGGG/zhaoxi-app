import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { ApiError, loginWithPassword, loginWithPin, setPin, startOtp, verifyOtp, type OtpChallenge } from "../src/api/client";
import { useNow } from "../src/hooks";
import { useI18n } from "../src/i18n";
import { registerForPush } from "../src/notifications";
import { colors, font, radius, shadow, space } from "../src/theme";
import { Button, Chip, Field, GlassCard, IconButton, Ionicons, Screen, haptic } from "../src/ui";
import { toast } from "../src/ui/toast";

type Mode = "otp" | "pin" | "password";
const dialCodes = ["+84", "+86", "+852", "+1"] as const;

export default function LoginScreen() {
  const { t, locale } = useI18n();
  const client = useQueryClient();
  const now = useNow(1000);
  const [mode, setMode] = useState<Mode>("otp");
  const [dial, setDial] = useState<(typeof dialCodes)[number]>("+84");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [code, setCode] = useState("");
  const [pin, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [stage, setStage] = useState<"form" | "setupPin">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = `${dial}${phone.replace(/\D/g, "").replace(/^0/, "")}`;
  useEffect(() => setError(""), [mode]);

  const describe = (e: unknown) => {
    const codeValue = e instanceof ApiError ? e.code : "";
    if (codeValue === "PHONE_ALREADY_REGISTERED") return t.login.registered;
    if (codeValue === "OTP_ALREADY_SENT") return t.login.otpActive;
    return e instanceof Error && e.message && !/^HTTP_|^[A-Z_]+$/.test(e.message) ? e.message : t.login.invalid;
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      haptic.warn();
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    haptic.success();
    await client.invalidateQueries();
    void registerForPush(locale, true);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const sendOtp = () => run(async () => {
    const result = await startOtp(fullPhone, locale);
    setChallenge(result);
    setResendAt(Date.now() + Number(result.resendAfterSeconds || 45) * 1000);
    setCode("");
    toast(`${t.login.sent} ${fullPhone}`, "info");
  });
  const verify = () => run(async () => {
    if (!challenge) return;
    await verifyOtp(fullPhone, challenge.challengeId, code);
    setStage("setupPin");
  });
  const pinLogin = () => run(async () => {
    if (pin.length !== 6) throw new Error(t.login.invalid);
    await loginWithPin(phone.trim() ? { phone: fullPhone, pin } : { username: username.trim().toLowerCase(), pin });
    await finish();
  });
  const passwordLogin = () => run(async () => {
    const result = await loginWithPassword({ username, password, mode: register ? "register" : "login", locale });
    if (register || result.isNewUser) setStage("setupPin");
    else await finish();
  });
  const savePin = () => run(async () => {
    if (pin.length !== 6 || pin !== pinConfirm) throw new Error(t.security.mismatch);
    await setPin(pin);
    await finish();
  });

  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <Screen topbar={false} edges={["top", "bottom"]} style={{ backgroundColor: "rgba(15,23,42,0.55)" }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={styles.sheet}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <IconButton icon="close" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          </View>
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center", gap: 10 }}>
            <Image source={require("../assets/brand-logo.png")} style={styles.logo} contentFit="cover" />
            <Text style={[font.h1, { textAlign: "center" }]}>{stage === "setupPin" ? t.login.setupPin : t.login.title}</Text>
            <Text style={[font.small, { textAlign: "center" }]}>{stage === "setupPin" ? t.login.setupPinHint : t.login.subtitle}</Text>
          </Animated.View>

          {stage === "setupPin" ? (
            <Animated.View entering={FadeInDown}>
              <View style={{ gap: 12 }}>
                <Field label={t.security.newPin} value={pin} onChangeText={(v) => setPinValue(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} />
                <Field label={t.security.confirmPin} value={pinConfirm} onChangeText={(v) => setPinConfirm(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button title={t.security.savePin} icon="lock-closed" loading={busy} onPress={savePin} />
                <Button title={t.login.skip} variant="ghost" onPress={() => void finish()} />
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100)} layout={LinearTransition}>
              <View style={{ gap: 14 }}>
                <View style={styles.segment}>
                  {(["otp", "pin", "password"] as const).map((key) => (
                    <Chip key={key} label={key === "otp" ? t.login.otp : key === "pin" ? t.login.pinTab : t.login.passwordTab} active={mode === key} onPress={() => setMode(key)} />
                  ))}
                </View>

                {mode !== "password" ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.label}>{t.login.phone}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button small variant="secondary" title={dial} onPress={() => setDial(dialCodes[(dialCodes.indexOf(dial) + 1) % dialCodes.length]!)} style={{ minHeight: 48, minWidth: 72 }} />
                      <View style={{ flex: 1 }}><Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="912 345 678" /></View>
                    </View>
                  </View>
                ) : null}

                {mode === "otp" ? (
                  <>
                    {challenge ? (
                      <Animated.View entering={FadeIn} style={{ gap: 10 }}>
                        <Field label={t.login.code} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} style={styles.code} />
                        <Button title={t.login.verify} icon="shield-checkmark" loading={busy} disabled={code.length < 4} onPress={verify} />
                        <Button title={resendSeconds ? `${t.login.resendIn} ${resendSeconds}s` : t.login.resend} variant="ghost" disabled={resendSeconds > 0 || busy} onPress={sendOtp} />
                      </Animated.View>
                    ) : <Button title={t.login.sendOtp} icon="chatbox-ellipses" loading={busy} disabled={phone.replace(/\D/g, "").length < 8} onPress={sendOtp} />}
                  </>
                ) : null}

                {mode === "pin" ? (
                  <>
                    {!phone.trim() ? <Field label={t.login.username} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} /> : null}
                    <Field label={t.login.pin} value={pin} onChangeText={(v) => setPinValue(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} style={styles.code} />
                    <Button title={t.login.login} icon="log-in" loading={busy} disabled={pin.length !== 6 || (!phone.trim() && !username.trim())} onPress={pinLogin} />
                  </>
                ) : null}

                {mode === "password" ? (
                  <>
                    <Field label={t.login.username} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" />
                    <Field label={t.login.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? "new-password" : "current-password"} />
                    <Button title={register ? t.login.register : t.login.login} icon={register ? "person-add" : "log-in"} loading={busy} disabled={username.trim().length < 3 || password.length < 6} onPress={passwordLogin} />
                    <Button title={register ? t.login.haveAccount : t.login.noAccount} variant="ghost" onPress={() => setRegister((v) => !v)} />
                  </>
                ) : null}

                {error ? <Animated.View entering={FadeIn} style={styles.errorBox}><Ionicons name="alert-circle" size={16} color={colors.danger} /><Text style={styles.error}>{error}</Text></Animated.View> : null}
              </View>
            </Animated.View>
          )}
          {stage === "form" ? <Button title={t.login.guest} variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: { width: "100%", maxWidth: 440, alignSelf: "center", padding: 24, paddingTop: 20, borderRadius: 28, backgroundColor: colors.white, gap: 16, shadowColor: "#0F172A", shadowOpacity: 0.25, shadowRadius: 32, shadowOffset: { width: 0, height: 24 } },
  logo: { width: 64, height: 64, borderRadius: 20 },
  segment: { flexDirection: "row", gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  code: { fontSize: 24, letterSpacing: 8, textAlign: "center", fontWeight: "800" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: radius.sm, backgroundColor: colors.dangerSoft },
  error: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: "700" },
});
