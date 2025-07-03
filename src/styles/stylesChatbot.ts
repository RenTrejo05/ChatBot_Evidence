import { StyleSheet } from "react-native";
import { colors } from "../utils/colors";

/**
 * Styles for the Chatbot UI components.
 */
export const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "bold",
  },
  main: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    flexShrink: 1,
    backgroundColor: colors.botBubble,
    padding: 16,
    paddingRight: 12,
    overflow: "hidden",
  },
  sidebarTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
    flexShrink: 1,
  },
  emptyText: {
    color: "#eee",
    fontStyle: "italic",
  },
  historyBubble: {
    flexDirection: "row",
    backgroundColor: colors.userBubble,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  historyIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  historyPregunta: {
    color: "#fff",
    marginVertical: 4,
  },
  historyFecha: {
    color: "#eee",
    fontSize: 10,
  },
  clearBtn: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#d9534f",
    borderRadius: 8,
    alignItems: "center",
  },
  clearText: {
    color: "#fff",
    fontWeight: "600",
  },
  chatArea: {
    flex: 1,
    overflow: "hidden",
  },
  chatContent: {
    paddingHorizontal: "5%",
    paddingTop: 16,
    paddingBottom: 16,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: "70%",
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    alignSelf: "flex-end",
  },
  botBubble: {
    backgroundColor: colors.botBubble,
    alignSelf: "flex-start",
  },
  bubbleText: {
    color: "#fff",
  },
  dropdown: {
    position: "absolute",
    bottom: 56,
    left: 12,
    right: 12,
    maxHeight: "30%",
    maxWidth: "40%",
    minWidth: "40%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  predefItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  inputRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  dropdownBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  inputWithButton: {
    maxWidth: "80%",
    flex: 1,
    minWidth: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#D7D7D7",
  },
  imageBackground: {
    width: "100%",
    height: "100%",
    opacity: 0.4,
  },
});
