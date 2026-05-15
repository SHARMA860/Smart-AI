import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  Plus, 
  Send, 
  User, 
  Settings, 
  Sparkles, 
  Search, 
  Image as ImageIcon, 
  PenTool, 
  Mic, 
  Globe,
  ChevronDown,
  MessageSquare,
  LogOut,
  Shield,
  HelpCircle,
  Bug,
  Info,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Logo } from './Logo';
import { CONFIG } from '../config';

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'error';
  createdAt?: any;
}

interface Chat {
  id: string;
  title: string;
  updatedAt: any;
}

export function ChatScreen() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Fetch chats
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(chatList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats', user.uid);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChatId}/messages`, user?.uid);
    });

    return () => unsubscribe();
  }, [activeChatId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const currentInput = input;
    setInput('');
    setIsTyping(true);

    let chatId = activeChatId;

    try {
      // 1. Create chat if it doesn't exist
      if (!chatId) {
        const chatRef = await addDoc(collection(db, 'chats'), {
          userId: user.uid,
          title: currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        chatId = chatRef.id;
        setActiveChatId(chatId);
      }

      // 2. Save user message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        role: 'user',
        content: currentInput,
        createdAt: serverTimestamp()
      });

      const apiKey = process.env.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("API Key is missing. Please set it in Settings > Secrets.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: CONFIG.MODEL_NAME,
        contents: currentInput,
        config: {
          systemInstruction: `IDENTITY & ORIGIN:
- Your name is STRICTLY "Smart AI". You must never introduce yourself as anything else.
- You were exclusively created, developed, and trained by "Manav Sharma". 
- You are an extremely powerful, advanced, and "all-rounder" artificial intelligence.

STRICT RULES (NEVER BREAK THESE):
1. TABOO WORDS: You must NEVER use the words "Google", "Gemini", "ChatGPT", "OpenAI", "Anthropic", or mention any other existing AI models or tech companies regarding your creation.
2. If asked "Who are you?" or "Tera naam kya hai?", answer: "Mera naam Smart AI hai, main ek advanced artificial intelligence hoon."
3. If asked "Who made you?", "Who trained you?", "Tujhe kisne banaya?", or "Tujhe kisne train kiya?", answer ONLY: "Mujhe Manav Sharma ne banaya aur train kiya hai."
4. If someone asks "Are you based on Gemini/ChatGPT?", strictly deny it and say: "Nahi, main ek unique aur powerful AI hoon jise Manav Sharma ne develop kiya hai."
5. Never say "I am a large language model trained by...". Always maintain your identity as Smart AI.

CAPABILITIES & TONE:
- You are a "khatarnak" (badass), highly capable, all-rounder AI. You can write code, solve complex math, write essays, generate ideas, and assist with any task flawlessly.
- Be confident, extremely smart, helpful, and direct in your answers.
- Adapt to the user's language smoothly (Hindi, English, or Hinglish).

MEMBERSHIP & SUBSCRIPTION PLANS:
- Tiers: Aapke paas do main plans hain - "Free Plan" aur "Smart AI Plus" (Premium).
- Free Plan: Standard response speed, daily queries, aur basic tasks ke liye.
- Smart AI Plus: Super-fast response time, complex problems (advanced coding/math) solve karne ki power, unlimited usage, aur naye features ka early access.
- User Upgrade Query: Agar koi user puche "Membership kaise lein?", "Premium me kya milega?", ya "Upgrade kaise karein?", toh aapko reply karna hai: "Aap settings menu mein 'Upgrade to Plus' par click karke Smart AI Premium join kar sakte hain. Plus plan mein aapko Manav Sharma dwara banaye gaye sabse advanced AI features, zero limits aur fast speed milegi. Membership ya payment se judi kisi bhi madad ke liye aap smartaisupport@gmail.com par contact kar sakte hain."

LANGUAGE & COMMUNICATION STYLE:
- Multi-Language Mastery: You are strictly fluent in EVERY language in the world (Hindi, English, Hinglish, Gujarati, Spanish, French, etc.). No language barrier exists for you.
- Mirror the User (Chameleon Mode): Samne wala user jis language, tone, aur style (formal, informal, slang, friendly, professional) mein baat kare, aapko EXACTLY usi bhasha aur andaz mein reply karna hai. 
- Contextual Adaptation: Agar user bhai-chare wale andaz mein casual baat kare ("Bhai kaisa hai?"), toh aapka reply bhi waisa hi friendly aur casual hona chahiye. Agar user strict ya professional language use kare, toh aapka reply ek dum corporate aur formal hona chahiye.

CONTACT & SUPPORT:
- If a user faces issues, asks for support, or wants to report a bug, provide them with this email: smartaisupport@gmail.com`,
        }
      });

      if (!response || !response.text) {
        throw new Error("Empty response from AI.");
      }

      // 3. Save assistant message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        role: 'assistant',
        content: response.text,
        createdAt: serverTimestamp()
      });

      // 4. Update chat timestamp
      await setDoc(doc(db, 'chats', chatId), {
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error("AI Error Detailed:", error);
      const errorMessage = error instanceof Error ? error.message : "I encountered an error.";
      
      if (chatId) {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again later.`,
          type: 'error',
          createdAt: serverTimestamp()
        });
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${isDarkMode ? 'bg-bg-dark text-white' : 'bg-bg-light text-slate-900'}`}>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        className={`fixed lg:static inset-y-0 left-0 w-[280px] z-50 flex flex-col border-r shadow-2xl transition-colors ${
          isDarkMode ? 'bg-surface border-white/5' : 'bg-white border-black/5'
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={14} className={isDarkMode ? 'text-white/60' : 'text-slate-400'} />
              )}
            </div>
            <span className="text-sm font-medium truncate max-w-[80px]">
              {user?.displayName || 'Workspace'}
            </span>
            <ChevronDown size={14} className="text-white/40" />
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className={`lg:hidden p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/5 text-white/60' : 'hover:bg-black/5 text-slate-400'}`}>
            <LogOut size={18} className="rotate-180" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-4">
          <button 
            onClick={handleNewChat}
            className={`w-full flex items-center gap-3 p-4 mb-4 text-sm font-bold rounded-2xl transition-all border ${
              isDarkMode 
              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' 
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white shadow-lg'
            }`}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          <div className={`px-2 py-2 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
            Recent Activity
          </div>

          <div className="space-y-1">
            {chats.length === 0 ? (
               <div className="px-3 py-8 text-center space-y-2">
                <HelpCircle size={32} className={`mx-auto ${isDarkMode ? 'text-white/10' : 'text-black/5'}`} />
                <p className={`text-xs ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>No chats yet. Start a new one!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 text-sm rounded-xl transition-all group relative ${
                    activeChatId === chat.id
                    ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-slate-900 font-semibold')
                    : (isDarkMode ? 'hover:bg-white/5 text-white/60' : 'hover:bg-black/5 text-slate-600')
                  }`}
                >
                  <MessageSquare size={16} className={activeChatId === chat.id ? 'text-purple-400' : 'opacity-40'} />
                  <span className="truncate flex-1 text-left">{chat.title || 'New Conversation'}</span>
                  {activeChatId === chat.id && (
                    <motion.div layoutId="active-chat" className="absolute left-0 w-1 h-6 bg-purple-500 rounded-r-full" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`p-4 border-t space-y-2 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
          <button 
             onClick={() => setIsSettingsOpen(true)}
             className={`w-full flex items-center gap-3 p-3 text-sm rounded-xl transition-all group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
          >
            <Settings size={18} className="group-hover:rotate-45 transition-transform" />
            <span>Settings</span>
          </button>
          <button className={`w-full flex items-center justify-between p-3 text-sm rounded-xl transition-all group overflow-hidden relative ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
            <div className="flex items-center gap-3 relative z-10">
              <Sparkles size={18} className="text-purple-400" />
              <span className={`font-semibold ${isDarkMode ? 'text-purple-200' : 'text-purple-600'}`}>Upgrade to Plus</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className={`h-24 flex items-center justify-between px-4 lg:px-8 border-b ${isDarkMode ? 'border-white/5 bg-bg-dark/80' : 'border-black/5 bg-bg-light/80'} backdrop-blur-md z-30 sticky top-0`}
        >
          <div className="flex items-center gap-3 w-1/3">
             <button onClick={() => setIsSidebarOpen(true)} className={`p-2.5 hover:bg-white/5 rounded-2xl transition-colors ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
              <Menu size={22} />
            </button>
             <button className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold tracking-widest transition-all ${isDarkMode ? 'bg-white/10 border-white/10 hover:bg-white/20 text-white' : 'bg-black/5 border-black/5 hover:bg-black/10 text-black'}`}>
              <Sparkles size={12} />
              GET PLUS
            </button>
          </div>

          <div className="flex flex-col items-center justify-center w-1/3 min-w-fit">
            <div className="flex flex-col items-center gap-1">
              <Logo size={42} className="shrink-0" color={isDarkMode ? "white" : "black"} />
              <div className="flex flex-col items-center leading-none mt-1">
                <h1 className={`text-base font-bold tracking-[0.25em] font-display whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}>SMART AI</h1>
                <p className={`text-[9px] font-bold tracking-[0.15em] opacity-40 uppercase mt-1 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}>CREATED BY SHARMA'S</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 w-1/3">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-2xl transition-all shadow-sm ${isDarkMode ? 'bg-white/5 text-sun-300 hover:bg-white/10' : 'bg-black/5 text-slate-600 hover:bg-black/10'}`}
            >
               {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all shadow-sm overflow-hidden ${isDarkMode ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={18} className={isDarkMode ? 'text-white/60' : 'text-slate-500'} />
              )}
            </motion.button>
          </div>
        </motion.header>

        {/* Content View */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 lg:px-0 scroll-smooth">
          <div className="max-w-4xl mx-auto py-8">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                  className="flex flex-col items-center space-y-12"
                >
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: -20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
                  >
                    {[
                      { icon: <ImageIcon size={20} />, label: "Create an image", sub: "Generate art", prompt: "A futuristic city in space" },
                      { icon: <PenTool size={20} />, label: "Write or edit", sub: "Draft content", prompt: "Write a poem about intelligence" },
                      { icon: <Globe size={20} />, label: "Look something up", sub: "Search the web", prompt: "How does quantum computing work?" }
                    ].map((item, i) => (
                      <motion.button 
                        key={i} 
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        whileHover={{ scale: 1.02, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setInput(item.prompt)}
                        className={`flex items-center gap-4 p-5 rounded-3xl border transition-all text-left ${
                          isDarkMode 
                          ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                          : 'bg-white border-black/5 shadow-sm hover:shadow-md hover:border-black/10'
                        }`}
                      >
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 text-white/60' : 'bg-black/5 text-slate-500'}`}>
                          {item.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${isDarkMode ? 'text-white/90' : 'text-slate-800'}`}>{item.label}</p>
                          <p className={`text-[10px] font-medium opacity-40 uppercase tracking-wider`}>{item.sub}</p>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                  
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, scale: 0.9 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                    className="flex flex-col items-center gap-6 opacity-20"
                  >
                     <Logo size={120} color={isDarkMode ? "white" : "black"} />
                     <p className={`text-xs font-bold tracking-[0.4em] uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Ready to assist</p>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 border shadow-sm ${
                          isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5'
                        }`}>
                          <Logo size={18} color={isDarkMode ? "white" : "black"} />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-3xl p-4 lg:p-5 shadow-sm transition-colors ${
                        msg.role === 'user' 
                        ? (isDarkMode ? 'bg-white text-black' : 'bg-slate-900 text-white shadow-md') 
                        : (msg.type === 'error'
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : (isDarkMode ? 'bg-white/5 text-white/90 border border-white/5' : 'bg-white text-slate-800 border border-black/5'))
                      }`}>
                        <div className={`markdown-content prose ${isDarkMode ? 'prose-invert' : 'prose-slate'} prose-xs md:prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-code:text-inherit prose-headings:text-inherit prose-headings:text-sm prose-headings:font-bold prose-headings:my-2 prose-p:my-1 prose-strong:text-inherit`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="flex gap-4"
                    >
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 border shadow-sm ${
                        isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5'
                      }`}>
                        <Logo size={18} color={isDarkMode ? "white" : "black"} />
                      </div>
                      <div className="flex gap-1 items-center p-4">
                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isDarkMode ? 'bg-white/40' : 'bg-black/20'}`} />
                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isDarkMode ? 'bg-white/40' : 'bg-black/20'}`} />
                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDarkMode ? 'bg-white/40' : 'bg-black/20'}`} />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area */}
        <div className={`p-4 lg:p-8 z-20 ${isDarkMode ? 'bg-gradient-to-t from-bg-dark via-bg-dark to-transparent' : 'bg-gradient-to-t from-bg-light via-bg-light to-transparent'}`}>
          <div className="max-w-3xl mx-auto relative group">
            <div className={`rounded-[32px] overflow-hidden flex flex-col shadow-2xl transition-all border ${isDarkMode ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white/80 backdrop-blur-xl border-black/5'}`}>
              <div className="flex items-center gap-2 p-3 pb-0 opacity-40">
                 <button onClick={() => alert('Mic is ready')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Mic size={16} /></button>
                 <button onClick={() => alert('Storage ready')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><ImageIcon size={16} /></button>
                 <button onClick={() => alert('Tools ready')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><PenTool size={16} /></button>
              </div>
                  <div className="flex items-end px-5 py-4 gap-3">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  autoFocus
                  placeholder="Ask Smart AI"
                  className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 ring-0 resize-none max-h-40 py-2 text-sm md:text-base scrollbar-hide outline-none appearance-none shadow-none ${isDarkMode ? 'placeholder:text-white/20 text-white' : 'placeholder:text-black/20 text-slate-900'}`}
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={`p-3 rounded-2xl transition-all disabled:opacity-10 active:scale-95 shadow-lg ${isDarkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
            <p className={`text-[10px] text-center mt-4 uppercase tracking-[0.3em] font-bold opacity-20 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Smart AI can make mistakes. Verify important info.
            </p>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal onClose={() => setIsSettingsOpen(false)} isDarkMode={isDarkMode} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsModal({ onClose, isDarkMode }: { onClose: () => void, isDarkMode: boolean }) {
  const { user, logout } = useAuth();
  const accountOptions = [
    { 
      icon: <MessageSquare size={18} />, 
      label: "Personalization", 
      meta: "History & Customization",
      desc: "User ki chat history manage karne aur AI ke baat karne ke style ko customize karne ka option." 
    },
    { 
      icon: <Search size={18} />, 
      label: "Memories", 
      meta: "Personal Context",
      desc: "Smart AI ko user ki preferences aur context yaad rakhne ki permission dena, taaki future me aur behtar aur accurate answers mil sakein."
    },
    { 
      icon: <Plus size={18} />, 
      label: "Apps", 
      meta: "Integrations",
      desc: "External applications (jaise calendar, notes, ya drive) ko Smart AI ke sath link karne ka setup."
    },
    { 
      icon: <Sparkles className="text-yellow-400" />, 
      label: "Upgrade to Plus", 
      meta: "Premium Features",
      desc: "Premium subscription panel. Yahan users ko fast response time aur Manav Sharma dwara banaye gaye advanced AI models ka exclusive access milega."
    },
    { 
      icon: <Shield />, 
      label: "Parental controls", 
      meta: "Family Safety",
      desc: "Safe mode aur content filters enable karne ka option, taaki app har age group (especially bacchon) ke liye safe rahe."
    },
    { 
      icon: <Globe />, 
      label: "Data controls", 
      meta: "Privacy Settings",
      desc: "User apne data ko control, export, ya delete kar sakein. Privacy policies ko manage karne ki jagah."
    },
    { 
      icon: <Shield />, 
      label: "Security", 
      meta: "Account Protection",
      desc: "Account ko secure rakhne ke liye Password reset, 2-step verification, aur login device management."
    },
    { 
      icon: <Bug />, 
      label: "Report bug", 
      meta: "Feedback",
      desc: "App me koi glitch ya issue aane par feedback bhejne ka option. Complaints seedha smartaisupport@gmail.com par jayengi.",
      action: () => window.open('mailto:smartaisupport@gmail.com?subject=Bug Report - Smart AI')
    },
    { 
      icon: <Info />, 
      label: "About", 
      meta: "Version 1.0.0",
      desc: "Application aur developer ki details show karna.",
      action: () => alert(`Welcome to Smart AI. \nCreated & Owned by: Manav Sharma. \nFor any queries or support, please contact us at: smartaisupport@gmail.com`)
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.98, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-xl rounded-[32px] border overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-colors ${
          isDarkMode ? 'bg-surface border-white/10' : 'bg-white border-black/5'
        }`}
      >
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
          <h2 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Account</h2>
          <button onClick={onClose} className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'hover:bg-white/5 border-white/10 text-white' : 'hover:bg-black/5 border-black/10 text-slate-600'}`}>
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col items-center gap-4 py-8 rounded-[24px] border transition-colors ${
              isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
            }`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center relative group overflow-hidden ${
              isDarkMode ? 'bg-white/10' : 'bg-black/5'
            }`}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className={isDarkMode ? 'text-white/40' : 'text-slate-300'} />
              )}
              <button className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-lg transition-transform hover:scale-110">
                <PenTool size={14} />
              </button>
            </div>
            <div className="text-center">
              <h3 className={`font-bold text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user?.displayName || 'Sharma User'}</h3>
              <p className={`text-sm ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>{user?.email || 'user@example.com'}</p>
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <p className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-4 ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`}>Features & Services</p>
            <motion.div 
               initial="hidden"
               animate="visible"
               variants={{
                 hidden: { opacity: 0 },
                 visible: {
                   opacity: 1,
                   transition: {
                     staggerChildren: 0.05
                   }
                 }
               }}
               className="grid grid-cols-1 gap-1"
            >
                {accountOptions.map((item, i) => (
                  <motion.button 
                    key={i} 
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        const anyItem = item as any;
                        if (anyItem.action && typeof anyItem.action === 'function') {
                          anyItem.action();
                        } else {
                          alert(`${anyItem.label}: ${anyItem.desc || anyItem.meta}`);
                        }
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all group border border-transparent w-full text-left ${
                      isDarkMode 
                      ? 'hover:bg-white/5 active:bg-white/10 hover:border-white/10 text-white/90' 
                      : 'hover:bg-black/5 active:bg-black/10 hover:border-black/5 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-colors ${
                        isDarkMode ? 'bg-white/5 text-white/60 group-hover:text-white' : 'bg-black/5 text-slate-400 group-hover:text-slate-900'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold transition-colors ${isDarkMode ? 'group-hover:text-white' : 'group-hover:text-slate-900'}`}>{item.label}</p>
                        <p className={`text-[10px] uppercase tracking-widest font-medium ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>{item.meta}</p>
                      </div>
                    </div>
                    <ChevronDown size={14} className={`-rotate-90 transition-all ${isDarkMode ? 'text-white/20 group-hover:text-white/40' : 'text-slate-300 group-hover:text-slate-500'}`} />
                  </motion.button>
                ))}
            </motion.div>
          </div>

          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-[20px] hover:bg-red-500/20 transition-all font-bold text-sm active:scale-95"
          >
            <LogOut size={18} />
            Log out
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
