import { useState } from "react";
import {
  authenticateCustomer,
  createCustomerAccount,
  updateCustomerProfile,
} from "./database/localAccounts";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Screen =
  | "home"
  | "booking"
  | "tracking"
  | "profile"
  | "reviews"
  | "notifications"
  | "support"
  | "admin"
  | "partner";

type Service = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  price: string;
};

type Booking = {
  id: string;
  service: Service;
  date: string;
  time: string;
  address: string;
  payment: string;
  stage: number;
};

const COLORS = {
  ink: "#17243A",
  muted: "#748198",
  blue: "#315DEB",
  paleBlue: "#EEF2FF",
  orange: "#F47B45",
  bg: "#F6F7FB",
  white: "#FFFFFF",
  line: "#E8EBF2",
  green: "#16845B",
};

const SERVICES: Service[] = [
  {
    id: "electrician",
    title: "इलेक्ट्रीशियन · Electrician",
    subtitle: "बिजली से जुड़ी सेवाएँ · Electrical help",
    emoji: "⚡",
    price: "₹199 से",
  },
  {
    id: "plumber",
    title: "प्लंबर · Plumber",
    subtitle: "पानी और पाइप · Plumbing",
    emoji: "🔧",
    price: "₹149 से",
  },
  {
    id: "ac",
    title: "AC रिपेयर · AC repair",
    subtitle: "सर्विस और मरम्मत · Service & repair",
    emoji: "❄️",
    price: "₹299 से",
  },
  {
    id: "cleaning",
    title: "सफाई · Cleaning",
    subtitle: "घर की सफाई · Home cleaning",
    emoji: "🧹",
    price: "₹399 से",
  },
];

const TRACKING_STAGES = [
  "बुकिंग की पुष्टि · Booking confirmed",
  "पार्टनर नियुक्त · Partner assigned",
  "पार्टनर रास्ते में · Partner on the way",
  "सेवा शुरू · Service started",
  "काम पूरा · Completed",
];

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A0A8B7"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function ServiceCard({
  service,
  onPress,
}: {
  service: Service;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.serviceCard}>
      <View style={styles.serviceIcon}>
        <Text style={styles.serviceEmoji}>{service.emoji}</Text>
      </View>
      <Text style={styles.serviceTitle}>{service.title}</Text>
      <Text style={styles.smallMuted}>{service.subtitle}</Text>
      <Text style={styles.servicePrice}>{service.price}</Text>
    </Pressable>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [customerUserId, setCustomerUserId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("आज · Today");
  const [time, setTime] = useState("10:00 AM");
  const [payment, setPayment] = useState("सेवा के बाद · Pay after service");
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const startBooking = (service: Service) => {
    setSelectedService(service);
    setScreen("booking");
  };

  const submitAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (
      !normalizedEmail ||
      !password ||
      (authMode === "signup" && !name.trim())
    ) {
      Alert.alert(
        "जानकारी अधूरी · Missing details",
        "कृपया नाम, ईमेल और पासवर्ड भरें। · Please complete the required fields.",
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert("ईमेल जाँचें · Check your email", "कृपया सही ईमेल पता दर्ज करें। · Enter a valid email address.");
      return;
    }
    if (authMode === "signup" && password.length < 8) {
      Alert.alert(
        "पासवर्ड छोटा है · Password too short",
        "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए। · Use at least 8 characters.",
      );
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const account = await createCustomerAccount({ name, email: normalizedEmail, phone, password });
        if (!account) {
          Alert.alert(
            "अकाउंट पहले से है · Account already exists",
            "इस ईमेल से लॉग इन करें। · Log in with this email instead.",
          );
          return;
        }
        setCustomerUserId(account.id);
        setName(account.name);
        setEmail(account.email);
        setPhone(account.phone);
      } else {
        const account = await authenticateCustomer(normalizedEmail, password);
        if (!account) {
          Alert.alert(
            "लॉग इन नहीं हुआ · Could not log in",
            "ईमेल या पासवर्ड सही नहीं है। · Check your email and password.",
          );
          return;
        }
        setCustomerUserId(account.id);
        setName(account.name);
        setEmail(account.email);
        setPhone(account.phone);
      }
      setAuthenticated(true);
      setScreen("home");
      setPassword("");
    } catch (error) {
      console.error("Local account operation failed", error);
      Alert.alert(
        "अकाउंट सेव नहीं हुआ · Account unavailable",
        "लोकल डेटाबेस तक पहुँच नहीं हो सकी। कृपया फिर कोशिश करें। · Could not access the local database. Please try again.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const confirmBooking = () => {
    if (!address.trim()) {
      Alert.alert(
        "पता जोड़ें · Add your address",
        "बुकिंग के लिए सेवा का पता ज़रूरी है। · An address is required to book.",
      );
      return;
    }
    setActiveBooking({
      id: `FX-${Date.now().toString().slice(-6)}`,
      service: selectedService,
      date,
      time,
      address: address.trim(),
      payment,
      stage: 0,
    });
    setScreen("tracking");
    Alert.alert(
      "बुकिंग हो गई · Booking placed",
      "यह demo booking है; कोई वास्तविक भुगतान नहीं लिया गया। · Demo only; no real payment was taken.",
    );
  };

  const advanceBooking = () => {
    setActiveBooking((current) =>
      current ? { ...current, stage: Math.min(current.stage + 1, TRACKING_STAGES.length - 1) } : current,
    );
  };

  const submitReview = () => {
    if (!review.trim()) {
      Alert.alert(
        "फीडबैक लिखें · Add feedback",
        "कृपया एक छोटी टिप्पणी लिखें। · Please leave a short comment.",
      );
      return;
    }
    Alert.alert(
      "धन्यवाद · Thank you",
      `आपकी ${rating}-स्टार रेटिंग demo में सेव हुई। · Your ${rating}-star rating was saved in this demo.`,
    );
    setReview("");
    setScreen("home");
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert(
        "नाम दर्ज करें · Add your name",
        "प्रोफ़ाइल सेव करने के लिए नाम ज़रूरी है। · A name is required to save your profile.",
      );
      return;
    }
    if (customerUserId === null) {
      Alert.alert(
        "डेमो प्रोफ़ाइल · Demo profile",
        "प्रोफ़ाइल सेव करने के लिए पहले अकाउंट बनाएँ। · Create an account to save your profile.",
      );
      return;
    }
    try {
      await updateCustomerProfile(customerUserId, name, phone);
      Alert.alert("प्रोफ़ाइल सेव हुई · Profile saved", "बदलाव इस डिवाइस पर सेव हुए। · Changes saved on this device.");
    } catch (error) {
      console.error("Local profile update failed", error);
      Alert.alert(
        "प्रोफ़ाइल सेव नहीं हुई · Profile not saved",
        "लोकल डेटाबेस तक पहुँच नहीं हो सकी। कृपया फिर कोशिश करें। · Could not access the local database. Please try again.",
      );
    }
  };

  const renderAuth = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>F</Text>
        </View>
        <Text style={styles.brandName}>Fixify</Text>
        <Text style={styles.authTitle}>
          {authMode === "login"
            ? "घर की मदद, बस एक टैप दूर · Home help, one tap away"
            : "अपना अकाउंट बनाएँ · Create your account"}
        </Text>
        <Text style={styles.authSubtitle}>
          भरोसेमंद घरेलू सेवाएँ · Trusted home services
        </Text>
        <View style={styles.authCard}>
          {authMode === "signup" && (
            <Field
              label="पूरा नाम · Full name"
              onChangeText={setName}
              placeholder="आपका नाम · Your name"
              value={name}
            />
          )}
          <Field
            keyboardType="email-address"
            label="ईमेल · Email"
            onChangeText={setEmail}
            placeholder="name@example.com"
            value={email}
          />
          {authMode === "signup" && (
            <Field
              keyboardType="phone-pad"
              label="फ़ोन · Phone"
              onChangeText={setPhone}
              placeholder="मोबाइल नंबर · Mobile number"
              value={phone}
            />
          )}
          <Field
            label="पासवर्ड · Password"
            onChangeText={setPassword}
            placeholder="पासवर्ड दर्ज करें · Enter password"
            secureTextEntry
            value={password}
          />
          <ActionButton
            disabled={authLoading}
            label={
              authLoading
                ? "कृपया प्रतीक्षा करें · Please wait"
                : authMode === "login"
                  ? "लॉग इन करें · Log in"
                  : "अकाउंट बनाएँ · Sign up"
            }
            onPress={submitAuth}
          />
          <Pressable
            onPress={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            style={styles.textButton}
          >
            <Text style={styles.linkText}>
              {authMode === "login"
                ? "नए हैं? अकाउंट बनाएँ · New here? Create an account"
                : "पहले से अकाउंट है? लॉग इन करें · Have an account? Log in"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setName("Demo customer");
            setEmail("");
            setPhone("");
            setPassword("");
            setCustomerUserId(null);
            setAuthenticated(true);
            setScreen("home");
          }}
          style={styles.guestButton}
        >
          <Text style={styles.guestText}>डेमो देखें · Explore demo</Text>
        </Pressable>
        <Text style={styles.demoNote}>
          अकाउंट इस डिवाइस के SQLite डेटाबेस में सेव होते हैं; अन्य डिवाइसों से साझा नहीं होते।
          · Accounts are saved in this device's SQLite database and aren't shared across devices.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  if (!authenticated) return renderAuth();

  const renderHome = () => (
    <>
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.eyebrow}>नमस्ते · HELLO</Text>
          <Text style={styles.pageTitle}>{name || "ग्राहक · Customer"}</Text>
        </View>
        <Pressable onPress={() => setScreen("notifications")} style={styles.bellButton}>
          <Text style={styles.bellText}>🔔</Text>
          <View style={styles.notificationDot} />
        </Pressable>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>FIXIFY HOME SERVICES</Text>
        <Text style={styles.heroTitle}>घर की हर समस्या का आसान हल</Text>
        <Text style={styles.heroSubtitle}>Reliable help for every corner of your home.</Text>
        <Pressable
          onPress={() => startBooking(SERVICES[0])}
          style={styles.heroButton}
        >
          <Text style={styles.heroButtonText}>सर्विस बुक करें · Book a service  →</Text>
        </Pressable>
        <Text style={styles.heroFootnote}>सुरक्षित · भरोसेमंद · आपके पास · Safe · Trusted · Nearby</Text>
      </View>
      <View style={styles.sectionHeader}>
        <SectionTitle>सर्विस चुनें · Choose a service</SectionTitle>
        <Text style={styles.smallMuted}>सभी देखें · View all</Text>
      </View>
      <View style={styles.serviceGrid}>
        {SERVICES.map((service) => (
          <ServiceCard
            key={service.id}
            onPress={() => startBooking(service)}
            service={service}
          />
        ))}
      </View>
      <View style={styles.sectionHeader}>
        <SectionTitle>आपकी बुकिंग · Your booking</SectionTitle>
        {activeBooking ? (
          <Pressable onPress={() => setScreen("tracking")}>
            <Text style={styles.linkText}>ट्रैक करें · Track</Text>
          </Pressable>
        ) : null}
      </View>
      {activeBooking ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activeBooking.service.title}</Text>
          <Text style={styles.bodyMuted}>
            {activeBooking.date} · {activeBooking.time} · {activeBooking.id}
          </Text>
          <Text style={styles.statusText}>{TRACKING_STAGES[activeBooking.stage]}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>अभी कोई बुकिंग नहीं · No bookings yet</Text>
          <Text style={styles.bodyMuted}>सर्विस चुनें और सुविधाजनक समय बुक करें।</Text>
        </View>
      )}
      <View style={styles.promoStrip}>
        <Text style={styles.promoEmoji}>🛡️</Text>
        <View style={styles.promoCopy}>
          <Text style={styles.cardTitle}>सत्यापित सर्विस पार्टनर</Text>
          <Text style={styles.smallMuted}>Verified partners · Support जब भी ज़रूरत हो</Text>
        </View>
      </View>
    </>
  );

  const renderBooking = () => (
    <>
      <SectionTitle>सर्विस बुक करें · Book a service</SectionTitle>
      <View style={styles.selectedService}>
        <Text style={styles.selectedEmoji}>{selectedService.emoji}</Text>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>{selectedService.title}</Text>
          <Text style={styles.smallMuted}>{selectedService.subtitle}</Text>
        </View>
        <Text style={styles.servicePrice}>{selectedService.price}</Text>
      </View>
      <SectionTitle>तारीख चुनें · Choose a date</SectionTitle>
      <View style={styles.choiceRow}>
        {["आज · Today", "कल · Tomorrow", "शनि · Sat"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setDate(item)}
            style={[styles.choiceChip, date === item && styles.choiceChipSelected]}
          >
            <Text style={[styles.choiceText, date === item && styles.choiceTextSelected]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>समय चुनें · Choose a time</SectionTitle>
      <View style={styles.choiceRow}>
        {["10:00 AM", "1:00 PM", "4:00 PM"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setTime(item)}
            style={[styles.choiceChip, time === item && styles.choiceChipSelected]}
          >
            <Text style={[styles.choiceText, time === item && styles.choiceTextSelected]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle>सेवा का पता · Service address</SectionTitle>
      <Field
        label="लोकेशन · Location"
        onChangeText={setAddress}
        placeholder="घर का पता और इलाका · Address and area"
        value={address}
      />
      <Text style={styles.locationHint}>📍 GPS/map integration demo में उपलब्ध नहीं है।</Text>
      <SectionTitle>भुगतान · Payment</SectionTitle>
      <View style={styles.paymentOptions}>
        {[
          "सेवा के बाद · Pay after service",
          "डेमो ऑनलाइन भुगतान · Demo online payment",
        ].map((item) => (
          <Pressable
            key={item}
            onPress={() => setPayment(item)}
            style={[styles.paymentOption, payment === item && styles.paymentOptionSelected]}
          >
            <View style={[styles.radio, payment === item && styles.radioSelected]} />
            <Text style={styles.bodyText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.demoPaymentNote}>
        <Text style={styles.smallMuted}>
          Demo only · ऑनलाइन विकल्प कोई असली भुगतान नहीं करता और कार्ड जानकारी नहीं माँगता।
        </Text>
      </View>
      <ActionButton label="बुकिंग की पुष्टि करें · Confirm booking" onPress={confirmBooking} />
    </>
  );

  const renderTracking = () => (
    <>
      <SectionTitle>बुकिंग ट्रैक करें · Track your booking</SectionTitle>
      {activeBooking ? (
        <>
          <View style={styles.card}>
            <View style={styles.bookingHeader}>
              <Text style={styles.cardTitle}>{activeBooking.service.title}</Text>
              <Text style={styles.bookingId}>{activeBooking.id}</Text>
            </View>
            <Text style={styles.bodyMuted}>
              {activeBooking.date} · {activeBooking.time}
            </Text>
            <Text style={styles.bodyMuted}>📍 {activeBooking.address}</Text>
            <Text style={styles.statusText}>{TRACKING_STAGES[activeBooking.stage]}</Text>
          </View>
          <View style={styles.card}>
            {TRACKING_STAGES.map((stage, index) => (
              <View key={stage} style={styles.timelineRow}>
                <View style={styles.timelineMarkWrap}>
                  <View
                    style={[
                      styles.timelineMark,
                      index <= activeBooking.stage && styles.timelineMarkDone,
                    ]}
                  />
                  {index < TRACKING_STAGES.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <Text
                  style={[
                    styles.timelineText,
                    index <= activeBooking.stage && styles.timelineTextDone,
                  ]}
                >
                  {stage}
                </Text>
              </View>
            ))}
          </View>
          <ActionButton
            label="रेटिंग और फीडबैक · Rate this service"
            onPress={() => setScreen("reviews")}
            secondary
          />
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>ट्रैक करने के लिए बुकिंग नहीं</Text>
          <Text style={styles.bodyMuted}>Place a booking to see live demo updates.</Text>
          <ActionButton
            label="सर्विस चुनें · Browse services"
            onPress={() => setScreen("home")}
          />
        </View>
      )}
    </>
  );

  const renderProfile = () => (
    <>
      <SectionTitle>ग्राहक की जानकारी · User profile</SectionTitle>
      <View style={styles.profileHero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(name || "F").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>{name || "Fixify ग्राहक · Customer"}</Text>
          <Text style={styles.smallMuted}>{email || "डेमो अकाउंट · Demo account"}</Text>
        </View>
        <Text style={styles.verifiedBadge}>✓</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>प्रोफ़ाइल विवरण · Profile details</Text>
        <Field
          label="नाम · Name"
          onChangeText={setName}
          placeholder="आपका नाम · Your name"
          value={name}
        />
        <Field
          keyboardType="phone-pad"
          label="फ़ोन · Phone"
          onChangeText={setPhone}
          placeholder="मोबाइल नंबर · Mobile number"
          value={phone}
        />
        <Field
          label="पता · Address"
          onChangeText={setAddress}
          placeholder="घर का पता · Home address"
          value={address}
        />
        <ActionButton label="प्रोफ़ाइल सेव करें · Save profile" onPress={saveProfile} />
      </View>
      <SectionTitle>अकाउंट और सहायता · Account & help</SectionTitle>
      <View style={styles.menuCard}>
        <Pressable onPress={() => setScreen("notifications")} style={styles.menuRow}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuText}>नोटिफ़िकेशन · Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <Pressable onPress={() => setScreen("support")} style={styles.menuRow}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuText}>ग्राहक सहायता · Customer support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
        <Pressable onPress={() => setScreen("reviews")} style={styles.menuRow}>
          <Text style={styles.menuIcon}>⭐</Text>
          <Text style={styles.menuText}>रेटिंग और फीडबैक · Ratings & reviews</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>
      <SectionTitle>डेमो पैनल · Demo dashboards</SectionTitle>
      <View style={styles.twoButtons}>
        <ActionButton label="पार्टनर पैनल · Partner" onPress={() => setScreen("partner")} secondary />
        <ActionButton label="एडमिन पैनल · Admin" onPress={() => setScreen("admin")} secondary />
      </View>
      <ActionButton
        label="लॉग आउट · Log out"
        onPress={() => {
          setAuthenticated(false);
          setCustomerUserId(null);
          setAuthMode("login");
          setScreen("home");
        }}
        secondary
      />
      <Text style={styles.demoNote}>
        {customerUserId === null
          ? "डेमो प्रोफ़ाइल सेव नहीं होती · Demo profile changes aren't saved."
          : "प्रोफ़ाइल इस डिवाइस पर सेव होती है · Profile is saved on this device."}
      </Text>
    </>
  );

  const renderReviews = () => (
    <>
      <SectionTitle>रेटिंग और फीडबैक · Ratings & reviews</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>आपका अनुभव कैसा रहा?</Text>
        <Text style={styles.bodyMuted}>How was your Fixify service experience?</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <Text style={[styles.star, star <= rating && styles.starSelected]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="आपकी टिप्पणी · Your feedback"
          onChangeText={setReview}
          placeholder="हमें बताएँ · Tell us more"
          value={review}
        />
        <ActionButton label="फीडबैक भेजें · Submit review" onPress={submitReview} />
      </View>
      <Text style={styles.demoNote}>Reviews are stored only for this demo session.</Text>
    </>
  );

  const renderNotifications = () => (
    <>
      <SectionTitle>नोटिफ़िकेशन · Notifications</SectionTitle>
      <View style={styles.noticeCard}>
        <View style={styles.noticeIcon}><Text>✓</Text></View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>बुकिंग अपडेट · Booking updates</Text>
          <Text style={styles.bodyMuted}>
            बुकिंग की पुष्टि और पार्टनर की स्थिति यहाँ दिखेगी।
          </Text>
          <Text style={styles.noticeTime}>अभी · Just now</Text>
        </View>
      </View>
      <View style={styles.noticeCard}>
        <View style={[styles.noticeIcon, styles.noticeIconOrange]}><Text>✦</Text></View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>Fixify में आपका स्वागत है · Welcome</Text>
          <Text style={styles.bodyMuted}>घर की सेवाएँ अब आसानी से बुक करें।</Text>
          <Text style={styles.noticeTime}>आज · Today</Text>
        </View>
      </View>
      <Text style={styles.demoNote}>Notifications are sample messages; push notifications are not connected.</Text>
    </>
  );

  const renderSupport = () => (
    <>
      <SectionTitle>ग्राहक सहायता · Customer support</SectionTitle>
      <View style={styles.supportHero}>
        <Text style={styles.supportEmoji}>👋</Text>
        <Text style={styles.cardTitle}>हम मदद के लिए यहाँ हैं</Text>
        <Text style={styles.bodyMuted}>Our support team is ready to help with your booking.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>अक्सर पूछे जाने वाले सवाल · Quick help</Text>
        <Text style={styles.faqQuestion}>बुकिंग कैसे रद्द करूँ? · How do I cancel?</Text>
        <Text style={styles.bodyMuted}>डेमो बुकिंग में cancellation अभी उपलब्ध नहीं है।</Text>
        <Text style={styles.faqQuestion}>क्या भुगतान सुरक्षित है? · Is payment secure?</Text>
        <Text style={styles.bodyMuted}>इस demo में कोई वास्तविक भुगतान प्रोसेस नहीं होता।</Text>
      </View>
      <ActionButton
        label="बुकिंग देखें · View booking"
        onPress={() => setScreen("tracking")}
        secondary
      />
    </>
  );

  const renderPartner = () => (
    <>
      <SectionTitle>सर्विस पार्टनर पैनल · Service partner panel</SectionTitle>
      <View style={styles.partnerBanner}>
        <Text style={styles.partnerBannerTitle}>नमस्ते, पार्टनर! · Welcome, partner!</Text>
        <Text style={styles.partnerBannerText}>आज की डेमो बुकिंग और सेवा स्थिति मैनेज करें।</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeBooking ? "1" : "0"}</Text>
          <Text style={styles.smallMuted}>आज की बुकिंग</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>₹0</Text>
          <Text style={styles.smallMuted}>डेमो कमाई</Text>
        </View>
      </View>
      <SectionTitle>असाइन की गई बुकिंग · Assigned booking</SectionTitle>
      {activeBooking ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activeBooking.service.title}</Text>
          <Text style={styles.bodyMuted}>{activeBooking.date} · {activeBooking.time}</Text>
          <Text style={styles.bodyMuted}>पता · Address: {activeBooking.address}</Text>
          <Text style={styles.statusText}>{TRACKING_STAGES[activeBooking.stage]}</Text>
          <ActionButton
            disabled={activeBooking.stage >= TRACKING_STAGES.length - 1}
            label={
              activeBooking.stage >= TRACKING_STAGES.length - 1
                ? "सेवा पूरी · Service complete"
                : "अगला स्टेटस अपडेट करें · Update next status"
            }
            onPress={advanceBooking}
          />
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.bodyMuted}>अभी कोई बुकिंग असाइन नहीं है।</Text>
        </View>
      )}
      <Text style={styles.demoNote}>Partner assignment and status updates are simulated locally.</Text>
    </>
  );

  const renderAdmin = () => (
    <>
      <SectionTitle>एडमिन पैनल · Admin panel</SectionTitle>
      <View style={styles.partnerBanner}>
        <Text style={styles.partnerBannerTitle}>Fixify overview</Text>
        <Text style={styles.partnerBannerText}>ऐप और सेवाओं का demo management view.</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeBooking ? "1" : "0"}</Text>
          <Text style={styles.smallMuted}>कुल बुकिंग · Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.smallMuted}>सर्विस · Services</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.smallMuted}>पार्टनर · Partners</Text>
        </View>
      </View>
      <SectionTitle>सर्विस मैनेजमेंट · Service management</SectionTitle>
      {SERVICES.map((service) => (
        <View key={service.id} style={styles.adminServiceRow}>
          <Text style={styles.adminServiceEmoji}>{service.emoji}</Text>
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>{service.title}</Text>
            <Text style={styles.smallMuted}>{service.subtitle}</Text>
          </View>
          <Text style={styles.activeLabel}>सक्रिय · Active</Text>
        </View>
      ))}
      <Text style={styles.demoNote}>Admin metrics and service controls are sample data only.</Text>
    </>
  );

  const content = () => {
    switch (screen) {
      case "home":
        return renderHome();
      case "booking":
        return renderBooking();
      case "tracking":
        return renderTracking();
      case "profile":
        return renderProfile();
      case "reviews":
        return renderReviews();
      case "notifications":
        return renderNotifications();
      case "support":
        return renderSupport();
      case "partner":
        return renderPartner();
      case "admin":
        return renderAdmin();
    }
  };

  const navItems: { key: Screen; icon: string; label: string }[] = [
    { key: "home", icon: "⌂", label: "होम" },
    { key: "tracking", icon: "▣", label: "बुकिंग" },
    { key: "notifications", icon: "♧", label: "अपडेट" },
    { key: "profile", icon: "◉", label: "प्रोफ़ाइल" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setScreen("home")}
          style={styles.topBrand}
        >
          <View style={styles.topBrandMark}><Text style={styles.topBrandLetter}>F</Text></View>
          <Text style={styles.topBrandName}>Fixify</Text>
        </Pressable>
        <Text style={styles.demoPill}>DEMO</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content()}
      </ScrollView>
      <View style={styles.bottomNav}>
        {navItems.map((item) => {
          const active =
            screen === item.key ||
            (item.key === "tracking" && screen === "booking");
          return (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={() => setScreen(item.key)}
              style={styles.navItem}
            >
              <Text style={[styles.navIcon, active && styles.navActive]}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  authContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brandMark: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.blue,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  brandMarkText: { color: COLORS.white, fontSize: 32, fontWeight: "800" },
  brandName: { color: COLORS.ink, fontSize: 27, fontWeight: "800", marginTop: 10, textAlign: "center" },
  authTitle: { color: COLORS.ink, fontSize: 22, fontWeight: "800", lineHeight: 31, marginTop: 25, textAlign: "center" },
  authSubtitle: { color: COLORS.muted, fontSize: 14, marginBottom: 22, marginTop: 8, textAlign: "center" },
  authCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 20 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: COLORS.ink, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: {
    backgroundColor: "#FAFBFD",
    borderColor: COLORS.line,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.ink,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  button: {
    alignItems: "center",
    backgroundColor: COLORS.blue,
    borderRadius: 13,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  buttonText: { color: COLORS.white, fontSize: 14, fontWeight: "800", textAlign: "center" },
  secondaryButton: { backgroundColor: COLORS.paleBlue, borderColor: "#DCE4FF", borderWidth: 1 },
  secondaryButtonText: { color: COLORS.blue },
  disabledButton: { opacity: 0.55 },
  textButton: { alignItems: "center", paddingTop: 17 },
  linkText: { color: COLORS.blue, fontSize: 13, fontWeight: "700" },
  guestButton: { alignItems: "center", marginTop: 17, padding: 12 },
  guestText: { color: COLORS.ink, fontSize: 14, fontWeight: "700" },
  demoNote: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 14, textAlign: "center" },
  topBar: {
    alignItems: "center",
    backgroundColor: COLORS.bg,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topBrand: { alignItems: "center", flexDirection: "row" },
  topBrandMark: {
    alignItems: "center",
    backgroundColor: COLORS.blue,
    borderRadius: 9,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  topBrandLetter: { color: COLORS.white, fontSize: 17, fontWeight: "800" },
  topBrandName: { color: COLORS.ink, fontSize: 18, fontWeight: "800", marginLeft: 8 },
  demoPill: {
    backgroundColor: "#FFF0E8",
    borderRadius: 20,
    color: "#C45B2C",
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  content: { paddingBottom: 28, paddingHorizontal: 20, paddingTop: 12 },
  welcomeRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  pageTitle: { color: COLORS.ink, fontSize: 23, fontWeight: "800", marginTop: 3 },
  bellButton: { alignItems: "center", backgroundColor: COLORS.white, borderRadius: 15, height: 45, justifyContent: "center", width: 45 },
  bellText: { color: COLORS.ink, fontSize: 24, transform: [{ rotate: "180deg" }] },
  notificationDot: { backgroundColor: COLORS.orange, borderColor: COLORS.white, borderRadius: 5, borderWidth: 1.5, height: 10, position: "absolute", right: 9, top: 8, width: 10 },
  hero: { backgroundColor: COLORS.blue, borderRadius: 22, marginBottom: 25, overflow: "hidden", padding: 20 },
  heroEyebrow: { color: "#DCE4FF", fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: "800", lineHeight: 32, marginTop: 12, maxWidth: 280 },
  heroSubtitle: { color: "#E3E9FF", fontSize: 13, lineHeight: 20, marginTop: 7 },
  heroButton: { alignSelf: "flex-start", backgroundColor: COLORS.white, borderRadius: 11, marginTop: 17, paddingHorizontal: 13, paddingVertical: 12 },
  heroButtonText: { color: COLORS.blue, fontSize: 12, fontWeight: "800" },
  heroFootnote: { color: "#E3E9FF", fontSize: 10, marginTop: 14 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 13, marginTop: 5 },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800", lineHeight: 24, marginBottom: 13, marginTop: 8 },
  smallMuted: { color: COLORS.muted, fontSize: 11, lineHeight: 17 },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 22 },
  serviceCard: { backgroundColor: COLORS.white, borderColor: "#F0F1F5", borderRadius: 17, borderWidth: 1, marginBottom: 11, minHeight: 163, padding: 13, width: "48.5%" },
  serviceIcon: { alignItems: "center", backgroundColor: COLORS.paleBlue, borderRadius: 12, height: 39, justifyContent: "center", marginBottom: 11, width: 42 },
  serviceEmoji: { fontSize: 21 },
  serviceTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  servicePrice: { color: COLORS.blue, fontSize: 11, fontWeight: "800", marginTop: 7 },
  card: { backgroundColor: COLORS.white, borderColor: "#F0F1F5", borderRadius: 17, borderWidth: 1, marginBottom: 14, padding: 16 },
  cardTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  bodyMuted: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  bodyText: { color: COLORS.ink, fontSize: 13, lineHeight: 19 },
  statusText: { color: COLORS.green, fontSize: 12, fontWeight: "800", marginTop: 12 },
  emptyCard: { alignItems: "flex-start", backgroundColor: COLORS.white, borderRadius: 17, marginBottom: 15, padding: 17 },
  emptyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  promoStrip: { alignItems: "center", backgroundColor: "#FFF8F3", borderRadius: 16, flexDirection: "row", marginTop: 3, padding: 14 },
  promoEmoji: { fontSize: 24, marginRight: 12 },
  promoCopy: { flex: 1 },
  selectedService: { alignItems: "center", backgroundColor: COLORS.white, borderRadius: 16, flexDirection: "row", marginBottom: 11, padding: 14 },
  selectedEmoji: { fontSize: 27, marginRight: 11 },
  flexOne: { flex: 1 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 13 },
  choiceChip: { backgroundColor: COLORS.white, borderColor: COLORS.line, borderRadius: 12, borderWidth: 1, marginBottom: 7, marginRight: 7, paddingHorizontal: 12, paddingVertical: 10 },
  choiceChipSelected: { backgroundColor: COLORS.paleBlue, borderColor: COLORS.blue },
  choiceText: { color: COLORS.ink, fontSize: 12, fontWeight: "600" },
  choiceTextSelected: { color: COLORS.blue, fontWeight: "800" },
  locationHint: { color: COLORS.muted, fontSize: 11, marginBottom: 16, marginTop: -7 },
  paymentOptions: { backgroundColor: COLORS.white, borderRadius: 15, marginBottom: 8, paddingHorizontal: 13 },
  paymentOption: { alignItems: "center", borderBottomColor: COLORS.line, borderBottomWidth: 1, flexDirection: "row", minHeight: 49 },
  paymentOptionSelected: { backgroundColor: "#FAFBFF" },
  radio: { borderColor: "#AEB7C7", borderRadius: 9, borderWidth: 1.5, height: 17, marginRight: 10, width: 17 },
  radioSelected: { backgroundColor: COLORS.blue, borderColor: COLORS.blue, borderWidth: 5 },
  demoPaymentNote: { marginBottom: 14, paddingHorizontal: 4 },
  bookingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bookingId: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  timelineRow: { flexDirection: "row", minHeight: 48 },
  timelineMarkWrap: { alignItems: "center", marginRight: 12, width: 18 },
  timelineMark: { backgroundColor: "#D9DEE8", borderRadius: 7, height: 14, marginTop: 2, width: 14 },
  timelineMarkDone: { backgroundColor: COLORS.green },
  timelineLine: { backgroundColor: "#D9DEE8", flex: 1, marginVertical: 3, width: 2 },
  timelineText: { color: "#A0A8B7", flex: 1, fontSize: 12, paddingBottom: 13 },
  timelineTextDone: { color: COLORS.ink, fontWeight: "700" },
  profileHero: { alignItems: "center", backgroundColor: COLORS.white, borderRadius: 17, flexDirection: "row", marginBottom: 14, padding: 15 },
  avatar: { alignItems: "center", backgroundColor: COLORS.paleBlue, borderRadius: 24, height: 48, justifyContent: "center", marginRight: 12, width: 48 },
  avatarText: { color: COLORS.blue, fontSize: 19, fontWeight: "800" },
  verifiedBadge: { backgroundColor: "#E8F7F1", borderRadius: 12, color: COLORS.green, fontSize: 13, fontWeight: "800", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 },
  menuCard: { backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 18, paddingHorizontal: 14 },
  menuRow: { alignItems: "center", borderBottomColor: COLORS.line, borderBottomWidth: 1, flexDirection: "row", minHeight: 53 },
  menuIcon: { fontSize: 17, marginRight: 12, width: 23 },
  menuText: { color: COLORS.ink, flex: 1, fontSize: 12, fontWeight: "700" },
  menuArrow: { color: COLORS.muted, fontSize: 23 },
  twoButtons: { flexDirection: "row", gap: 8, marginBottom: 10 },
  starsRow: { flexDirection: "row", justifyContent: "center", marginVertical: 19 },
  star: { color: "#D7DCE5", fontSize: 36, marginHorizontal: 5 },
  starSelected: { color: "#F5A623" },
  noticeCard: { alignItems: "flex-start", backgroundColor: COLORS.white, borderRadius: 16, flexDirection: "row", marginBottom: 11, padding: 15 },
  noticeIcon: { alignItems: "center", backgroundColor: "#E8F7F1", borderRadius: 13, height: 38, justifyContent: "center", marginRight: 12, width: 38 },
  noticeIconOrange: { backgroundColor: "#FFF0E8" },
  noticeTime: { color: COLORS.muted, fontSize: 10, marginTop: 8 },
  supportHero: { alignItems: "center", backgroundColor: COLORS.paleBlue, borderRadius: 18, marginBottom: 15, padding: 24 },
  supportEmoji: { fontSize: 36, marginBottom: 12 },
  faqQuestion: { color: COLORS.ink, fontSize: 12, fontWeight: "800", marginTop: 17 },
  partnerBanner: { backgroundColor: COLORS.ink, borderRadius: 18, marginBottom: 14, padding: 18 },
  partnerBannerTitle: { color: COLORS.white, fontSize: 17, fontWeight: "800" },
  partnerBannerText: { color: "#CFD6E4", fontSize: 12, lineHeight: 19, marginTop: 6 },
  statsRow: { flexDirection: "row", gap: 9, marginBottom: 15 },
  statCard: { alignItems: "center", backgroundColor: COLORS.white, borderRadius: 15, flex: 1, paddingHorizontal: 8, paddingVertical: 16 },
  statNumber: { color: COLORS.blue, fontSize: 22, fontWeight: "800", marginBottom: 5 },
  adminServiceRow: { alignItems: "center", backgroundColor: COLORS.white, borderRadius: 14, flexDirection: "row", marginBottom: 9, padding: 12 },
  adminServiceEmoji: { fontSize: 20, marginRight: 10 },
  activeLabel: { color: COLORS.green, fontSize: 9, fontWeight: "800" },
  bottomNav: { alignItems: "center", backgroundColor: COLORS.white, borderTopColor: COLORS.line, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingBottom: 7, paddingTop: 9 },
  navItem: { alignItems: "center", minWidth: 55, paddingHorizontal: 6 },
  navIcon: { color: "#9AA3B2", fontSize: 20, fontWeight: "700" },
  navLabel: { color: "#9AA3B2", fontSize: 9, fontWeight: "600", marginTop: 3 },
  navActive: { color: COLORS.blue, fontWeight: "800" },
});
