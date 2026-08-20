/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Image as ImageIcon, 
  Languages, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  FileText,
  RefreshCw,
  ArrowRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import JSZip from 'jszip';
import { cn } from './lib/utils';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'te', name: 'Telugu' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ml', name: 'Malayalam' },
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawText, setRawText] = useState<string>('');
  const [correctedText, setCorrectedText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [targetLang, setTargetLang] = useState('en');
  const [copied, setCopied] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImage(result);
        processImage(result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] as string[] },
    multiple: false
  });

  const processImage = async (base64Data: string) => {
    setIsProcessing(true);
    setRawText('');
    setCorrectedText('');
    setTranslatedText('');
    
    try {
      const base64Content = base64Data.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Content,
              },
            },
            {
              text: "Extract all text from this image. Then, provide a corrected and enhanced version of this text that fixes any OCR errors, grammar, and formatting. Format your response as a JSON object with two keys: 'raw' and 'corrected'.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text || '{}');
      setRawText(result.raw || 'No text detected.');
      setCorrectedText(result.corrected || 'No text detected.');
      toast.success('Text extracted and corrected successfully!');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const translateText = async (text: string, langCode: string) => {
    if (!text) return;
    setIsProcessing(true);
    try {
      const langName = LANGUAGES.find(l => l.code === langCode)?.name;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${langName}. Provide only the translated text:\n\n${text}`,
      });
      setTranslatedText(response.text || '');
      toast.success(`Translated to ${langName}!`);
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Translation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const downloadAsZip = async () => {
    if (!correctedText) return;
    
    const zip = new JSZip();
    zip.file("raw_text.txt", rawText);
    zip.file("corrected_text.txt", correctedText);
    
    if (translatedText) {
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || 'translated';
      zip.file(`translated_text_${langName.toLowerCase()}.txt`, translatedText);
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = "ai_vision_results.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('ZIP file downloaded!');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast.error('Failed to create ZIP file.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#F27D26]/20">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="border-b border-[#1A1A1A]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">AI Vision Text Pro</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium opacity-60">
            <span>OCR</span>
            <span>•</span>
            <span>Correction</span>
            <span>•</span>
            <span>Translation</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column: Upload & Image */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight leading-tight">
                Turn Images into <span className="text-[#F27D26]">Perfect Text</span>
              </h2>
              <p className="text-lg text-[#1A1A1A]/60 max-w-md">
                Upload any image with text. Our AI will extract, fix errors, and translate it instantly.
              </p>
            </div>

            <div 
              {...getRootProps()} 
              className={cn(
                "relative group cursor-pointer aspect-video rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-center items-center justify-center overflow-hidden",
                isDragActive ? "border-[#F27D26] bg-[#F27D26]/5" : "border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 bg-white"
              )}
            >
              <input {...getInputProps()} />
              
              {image ? (
                <>
                  <img 
                    src={image} 
                    alt="Uploaded" 
                    className="w-full h-full object-contain p-4"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white px-6 py-3 rounded-full font-medium flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Change Image
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 p-8">
                  <div className="w-16 h-16 bg-[#1A1A1A]/5 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 opacity-40" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Drop your image here</p>
                    <p className="text-sm text-[#1A1A1A]/40">or click to browse files</p>
                  </div>
                </div>
              )}
            </div>

            {image && !isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-3"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setTargetLang(lang.code);
                      translateText(correctedText, lang.code);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      targetLang === lang.code 
                        ? "bg-[#1A1A1A] text-white" 
                        : "bg-white border border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30"
                    )}
                  >
                    {lang.name}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-[600px] flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-[#1A1A1A]/5"
                >
                  <Loader2 className="w-10 h-10 animate-spin text-[#F27D26]" />
                  <p className="font-medium text-[#1A1A1A]/60">AI is thinking...</p>
                </motion.div>
              ) : rawText ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Raw Text Card */}
                  <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#1A1A1A]/40">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Raw Detected Text</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(rawText, 'raw')}
                        className="p-2 hover:bg-[#1A1A1A]/5 rounded-lg transition-colors"
                      >
                        {copied === 'raw' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[#1A1A1A]/80 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                      {rawText}
                    </p>
                  </div>

                  {/* Corrected Text Card */}
                  <div className="bg-[#1A1A1A] rounded-3xl p-8 space-y-6 shadow-xl shadow-[#1A1A1A]/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/40">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Corrected & Enhanced</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={downloadAsZip}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center gap-2 text-xs font-medium"
                          title="Download as ZIP"
                        >
                          <Download className="w-4 h-4" />
                          <span>ZIP</span>
                        </button>
                        <button 
                          onClick={() => copyToClipboard(correctedText, 'corrected')}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        >
                          {copied === 'corrected' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                      {correctedText}
                    </p>
                  </div>

                  {/* Translated Text Card */}
                  {translatedText && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#F27D26] rounded-3xl p-8 space-y-6 shadow-xl shadow-[#F27D26]/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/60">
                          <Languages className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Translated to {LANGUAGES.find(l => l.code === targetLang)?.name}
                          </span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(translatedText, 'translated')}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        >
                          {copied === 'translated' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                      <p className="text-white text-lg leading-relaxed whitespace-pre-wrap font-medium">
                        {translatedText}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center space-y-6 bg-white rounded-3xl border border-[#1A1A1A]/5 border-dashed">
                  <div className="w-20 h-20 bg-[#1A1A1A]/5 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-semibold text-xl">No results yet</p>
                    <p className="text-[#1A1A1A]/40 max-w-[240px]">
                      Upload an image to see the AI magic happen here.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A]/5 py-12 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-40">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by Gemini AI</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-[#1A1A1A]/40">
            <a href="#" className="hover:text-[#1A1A1A] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1A1A1A] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#1A1A1A] transition-colors">Feedback</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
