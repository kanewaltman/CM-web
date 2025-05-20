// This file provides all icons needed by the application
// By centralizing icon imports, we can avoid ad blocker issues

// Import our custom implementation for blocked icons
import SecurityIcon from './icons/Fingerprint';

// Import all icons we need from Lucide
import {
  Search,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  Maximize2,
  MoreHorizontal,
  Trash2,
  LayoutGrid,
  RotateCcw,
  Copy,
  Clipboard,
  Palette,
  Monitor,
  // Added icons for Markets dropdown
  ListChecks,
  Plus,
  Edit,
  Globe,
  ListFilter
} from 'lucide-react';
export const ChevronLeft = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
); 

// Export our safe version of the fingerprint icon
export const Fingerprint = SecurityIcon;

// Re-export all other icons explicitly
export {
  Search,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  Maximize2,
  MoreHorizontal,
  Trash2,
  LayoutGrid,
  RotateCcw,
  Copy,
  Clipboard,
  Palette,
  Monitor,
  // Added icons for Markets dropdown
  ListChecks,
  Plus,
  Edit,
  Globe,
  ListFilter
}; 