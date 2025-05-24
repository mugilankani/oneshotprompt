
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Fix: Removed the original Modal component that used <style jsx global> and renamed CorrectedModal to Modal.
// The <style jsx> tag is Next.js specific and was causing an error in this React setup.
// The animation is now handled using Tailwind CSS classes for transitions.
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div 
        className={`bg-gradient-to-br from-purple-100 via-pink-100 to-red-100 p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-semibold text-purple-700">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors text-2xl font-bold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};


export default Modal;