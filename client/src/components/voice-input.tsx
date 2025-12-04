import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US"; // Could be dynamic

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          // Append to existing value or replace? Let's append with a space if there's text
          const newValue = value ? `${value} ${transcript}` : transcript;
          onChange(newValue);
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, [value, onChange]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const Component = as === "textarea" ? Textarea : Input;

  return (
    <div className="relative">
      <Component
        id={id}
        value={value || ""}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pr-10", className)}
        {...props}
      />
      {isSupported && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-1 top-1 h-8 w-8 transition-colors",
            as === "textarea" ? "top-2" : "top-1",
            isListening ? "text-red-500 hover:text-red-600 bg-red-50" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={toggleListening}
          title={isListening ? "Stop recording" : "Start voice input"}
        >
          {isListening ? (
            <MicOff className="h-4 w-4 animate-pulse" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
