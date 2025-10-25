import { Button } from "@/components/ui/button";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
const Regions = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const regions = [{
    name: "Côte d'Azur",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80",
    count: "450+ livrets"
  }, {
    name: "Paris & Île-de-France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    count: "820+ livrets"
  }, {
    name: "Provence",
    image: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&q=80",
    count: "320+ livrets"
  }, {
    name: "Alpes",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    count: "280+ livrets"
  }];
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  return;
};
export default Regions;