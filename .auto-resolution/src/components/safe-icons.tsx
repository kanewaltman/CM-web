// This file serves as a centralized place for all icons
// It helps avoid ad blocker issues by renaming potentially blocked icons

import { 
  Fingerprint, 
  Search, 
  Moon, 
  Sun, 
  ChevronDown, 
  Menu,
  LayoutGrid, 
  RotateCcw, 
  Copy, 
  Clipboard,
  Maximize2, 
  MoreHorizontal, 
  Trash2
} from 'lucide-react';

// Re-export potentially problematic icons with safe names
export const SecurityIcon = Fingerprint;
export const AuthIcon = Fingerprint;

// Re-export all other icons to centralize icon management
export {
  Search,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  LayoutGrid,
  RotateCcw,
  Copy,
  Clipboard,
  Maximize2,
  MoreHorizontal,
  Trash2
}; 