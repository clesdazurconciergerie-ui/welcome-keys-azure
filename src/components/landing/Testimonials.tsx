import { Star, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRef } from "react";
const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const testimonials = [{
    name: "Sophie Martin",
    role: "Propriétaire Airbnb",
    avatar: "SM",
    rating: 5,
    text: "Mes invités adorent ! Fini les longs messages de bienvenue. Tout est clair et accessible en un clic."
  }, {
    name: "Julien Dubois",
    role: "Conciergerie Premium",
    avatar: "JD",
    rating: 5,
    text: "Nous gérons 40 biens et Welkom nous a fait gagner un temps précieux. Le chatbot répond à 80% des questions."
  }, {
    name: "Claire Arnaud",
    role: "Maison d'hôtes",
    avatar: "CA",
    rating: 5,
    text: "Interface intuitive, rendu professionnel. Le QR code imprimé dans les chambres est très pratique."
  }];
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.85;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  return;
};
export default Testimonials;