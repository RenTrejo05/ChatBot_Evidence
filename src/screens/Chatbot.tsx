import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  Keyboard,
  Animated,
  Easing,
  ImageBackground,
  useWindowDimensions,
} from "react-native";
import axios from "axios";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { Background } from "@utils";
import { chatStyles as styles } from "../styles/stylesChatbot";

/**
 * Chatbot component managing user input, chat messages,
 * history sidebar, and predefined questions dropdown.
 */
export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { text: string; from: "user" | "bot" }[]
  >([]);
  const [history, setHistory] = useState<{ pregunta: string; fecha: string }[]>(
    []
  );
  const [showHistory, setShowHistory] = useState(false);
  const [predefs, setPredefs] = useState<{ texto: string; respuesta: string }[]>(
    []
  );
  const [showPredefs, setShowPredefs] = useState(false);

  const { width: screenWidth } = useWindowDimensions();
  const maxSidebar = Math.min(screenWidth * 0.7, 300);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const chatWidth = Animated.subtract(screenWidth, widthAnim);
  const scrollRef = useRef<ScrollView>(null);

  // API base URL
  const API_BASE =
    Platform.OS === "android"
      ? "http://10.0.2.2:4000/api"
      : "http://localhost:4000/api";

  // Load chat history
  const loadHistory = () => {
    axios
      .get(`${API_BASE}/historial`)
      .then(({ data }) =>
        setHistory(
          data.map((h: any) => ({
            pregunta: h.pregunta,
            fecha: new Date(h.fecha).toLocaleString(),
          }))
        )
      )
      .catch((err) => console.error("Error al cargar historial:", err));
  };

  // Load predefined questions
  const loadPredefs = () => {
    axios
      .get(`${API_BASE}/preguntas`)
      .then(({ data }) => setPredefs(data))
      .catch((err) => console.error("Error al cargar preguntas predefinidas:", err));
  };

  // Initialize messages, history, and predefined questions
  useEffect(() => {
    setMessages([{ text: "¡Hola! ¿En qué puedo ayudarte hoy?", from: "bot" }]);
    loadHistory();
    loadPredefs();
  }, []);

  // Animate sidebar
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: showHistory ? maxSidebar : 0,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [showHistory, maxSidebar]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Send user message and handle bot responses
  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    Keyboard.dismiss();
    setMessages((prev) => [...prev, { text, from: "user" }]);

    try {
      const { data } = await axios.post(`${API_BASE}/chat`, { message: text });
      const respuestas: string[] = data.respuestas ?? [data.respuesta];
      for (const r of respuestas) {
        setMessages((prev) => [...prev, { text: r, from: "bot" }]);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      setMessages((prev) => [
        ...prev,
        { text: "Error de conexión.", from: "bot" },
      ]);
    }
    loadHistory();
  };

  // Clear chat history and reload
  const clearHistory = async () => {
    try {
      await axios.delete(`${API_BASE}/historial`);
      loadHistory();
    } catch (err) {
      console.error("Error al limpiar historial:", err);
    }
  };

  // Select predefined question, set input, and send message
  const onSelectPredef = (texto: string) => {
    setShowPredefs(false);
    setInput(texto);
    setTimeout(sendMessage, 100);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding" })}
        keyboardVerticalOffset={20}
      >
        <View style={styles.container}>
          {/* Header with menu toggle */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowHistory((v) => !v)}
              style={styles.headerBtn}
            >
              <Feather name="menu" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>MediTime</Text>
          </View>

          <View style={styles.main}>
            {/* Sidebar showing chat history */}
            <Animated.View style={[styles.sidebar, { width: widthAnim }]}>
              {showHistory && (
                <>
                  <Text style={styles.sidebarTitle}>Historial</Text>
                  <ScrollView contentContainerStyle={{ paddingRight: 8 }}>
                    {history.map((h, i) => (
                      <View key={i} style={styles.historyBubble}>
                        <MaterialIcons
                          name={
                            h.pregunta.includes("?")
                              ? "help-outline"
                              : "chat-bubble-outline"
                          }
                          size={18}
                          color="#fff"
                          style={styles.historyIcon}
                        />
                        <View style={styles.historyTextContainer}>
                          <Text style={styles.historyLabel}>
                            {h.pregunta.includes("?") ? "Hiciste la siguiente pregunta:" : "Me dijiste lo siguiente:"}
                          </Text>
                          <Text style={styles.historyPregunta}>{h.pregunta}</Text>
                          <Text style={styles.historyFecha}>El día {h.fecha}</Text>
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
                      <Text style={styles.clearText}>Limpiar historial</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}
            </Animated.View>

            {/* Chat area with messages and input */}
            <Animated.View style={{ width: chatWidth }}>
              <ImageBackground
                source={Background}
                style={styles.chatArea}
                imageStyle={styles.imageBackground}
              >
                <ScrollView contentContainerStyle={styles.chatContent} ref={scrollRef}>
                  {messages.map((msg, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bubble,
                        msg.from === "user" ? styles.userBubble : styles.botBubble,
                      ]}
                    >
                      <Text style={styles.bubbleText}>{msg.text}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Dropdown for predefined questions */}
                {showPredefs && (
                  <View style={styles.dropdown}>
                    <ScrollView>
                      {predefs.map((p, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => onSelectPredef(p.texto)}
                          style={styles.predefItem}
                        >
                          <Text>{p.texto}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Input row with dropdown toggle and send button */}
                <View style={styles.inputRow}>
                  <TouchableOpacity
                    onPress={() => setShowPredefs((v) => !v)}
                    style={styles.dropdownBtn}
                  >
                    <Feather name="chevron-down" size={20} color="#333" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.inputWithButton}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Escribe tu pregunta..."
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                  />
                  <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                    <Feather name="arrow-up" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
