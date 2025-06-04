import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import type { User } from "@shared/schema";

interface MatchModalProps {
  user: User;
  onClose: () => void;
  onStartChat: () => void;
  onWhatsApp: () => void;
}

export default function MatchModal({ user, onClose, onStartChat, onWhatsApp }: MatchModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-fitness-green rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-fitness-dark mb-2">
          It's a Match!
        </h3>
        
        <p className="text-gray-600 mb-6">
          You and {user.name} both want to workout together. Start chatting and plan your session!
        </p>
        
        <div className="space-y-3">
          <Button 
            className="w-full bg-fitness-blue hover:bg-blue-600 text-white py-3 rounded-xl font-medium"
            onClick={onStartChat}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Start Chatting
          </Button>
          
          {user.whatsappNumber && (
            <Button 
              className="w-full bg-fitness-green hover:bg-green-600 text-white py-3 rounded-xl font-medium"
              onClick={onWhatsApp}
            >
              <FaWhatsapp className="w-4 h-4 mr-2" />
              Message on WhatsApp
            </Button>
          )}
          
          <Button 
            variant="ghost"
            className="w-full text-gray-500 py-2"
            onClick={onClose}
          >
            Keep Swiping
          </Button>
        </div>
      </div>
    </div>
  );
}
