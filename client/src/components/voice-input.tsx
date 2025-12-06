import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface VoiceInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  as?: "input" | "textarea";
  [key: string]: any;
}

export function VoiceInput({ 
  value, 
  onChange, 
  placeholder, 
  id, 
  className, 
  as = "input",
  ...props 
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = i18n.language === "ar" ? "ar-SA" : "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setIsInitializing(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsInitializing(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setIsInitializing(false);

        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            setPermissionDenied(true);
            toast({
              title: t('voice.permissionDenied', 'Microphone Access Denied'),
              description: t('voice.permissionDeniedDesc', 'Please allow microphone access in your browser settings to use voice input.'),
              variant: "destructive",
            });
            break;
          case "no-speech":
            toast({
              title: t('voice.noSpeech', 'No Speech Detected'),
              description: t('voice.noSpeechDesc', 'Please try speaking again.'),
            });
            break;
          case "audio-capture":
            toast({
              title: t('voice.audioError', 'Microphone Error'),
              description: t('voice.audioErrorDesc', 'Could not access microphone. Please check your device.'),
              variant: "destructive",
            });
            break;
          case "network":
            toast({
              title: t('voice.networkError', 'Network Error'),
              description: t('voice.networkErrorDesc', 'Speech recognition requires an internet connection.'),
              variant: "destructive",
            });
            break;
          case "service-not-allowed":
            setIsSupported(false);
            break;
          default:
            toast({
              title: t('voice.error', 'Voice Input Error'),
              description: t('voice.errorDesc', 'Something went wrong. Please try again.'),
              variant: "destructive",
            });
        }
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          const newValue = value ? `${value} ${transcript}` : transcript;
          onChange(newValue);
        }
      };

      return recognition;
    } catch (error) {
      console.error("Failed to initialize speech recognition:", error);
      setIsSupported(false);
      return null;
    }
  }, [i18n.language, onChange, t, toast, value]);

  useEffect(() => {
    recognitionRef.current = initRecognition();
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [initRecognition]);

  const toggleListening = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSupported || permissionDenied) {
      if (permissionDenied) {
        toast({
          title: t('voice.permissionDenied', 'Microphone Access Denied'),
          description: t('voice.permissionDeniedDesc', 'Please allow microphone access in your browser settings.'),
          variant: "destructive",
        });
      }
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        setIsListening(false);
      }
    } else {
      setIsInitializing(true);
      
      // Request microphone permission explicitly first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (permError) {
        console.error("Microphone permission error:", permError);
        setPermissionDenied(true);
        setIsInitializing(false);
        toast({
          title: t('voice.permissionDenied', 'Microphone Access Denied'),
          description: t('voice.permissionDeniedDesc', 'Please allow microphone access in your browser settings.'),
          variant: "destructive",
        });
        return;
      }

      // Reinitialize recognition to get fresh language setting
      recognitionRef.current = initRecognition();
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error: any) {
          console.error("Failed to start speech recognition:", error);
          setIsInitializing(false);
          
          if (error.message?.includes("already started")) {
            // Already listening
            setIsListening(true);
          } else {
            toast({
              title: t('voice.error', 'Voice Input Error'),
              description: t('voice.errorDesc', 'Could not start voice input. Please try again.'),
              variant: "destructive",
            });
          }
        }
      } else {
        setIsInitializing(false);
        setIsSupported(false);
      }
    }
  };

  const Component = as === "textarea" ? Textarea : Input;

  // Check if browser supports secure context (needed for speech API on production)
  const isSecureContext = typeof window !== "undefined" && window.isSecureContext;

  return (
    <div className="relative">
      <Component
        id={id}
        value={value || ""}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pe-10", className)}
        {...props}
      />
      {isSupported && isSecureContext && !permissionDenied && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute end-1 h-8 w-8 transition-colors",
            as === "textarea" ? "top-2" : "top-1",
            isListening ? "text-red-500 bg-red-50 dark:bg-red-950/30" : "text-muted-foreground"
          )}
          onClick={toggleListening}
          disabled={isInitializing}
          title={isListening ? t('voice.stopRecording', 'Stop recording') : t('voice.startRecording', 'Start voice input')}
          data-testid="button-voice-input"
        >
          {isInitializing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-4 w-4 animate-pulse" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
      {permissionDenied && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute end-1 h-8 w-8 text-amber-500",
            as === "textarea" ? "top-2" : "top-1"
          )}
          onClick={toggleListening}
          title={t('voice.permissionRequired', 'Microphone permission required')}
          data-testid="button-voice-input-disabled"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
