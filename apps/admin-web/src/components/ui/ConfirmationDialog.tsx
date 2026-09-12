import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from './Card';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false
}: ConfirmationDialogProps) {
  
  const handleConfirm = async () => {
    await onConfirm();
  };

  const icons = {
    danger: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />
  };

  const buttonVariants = {
    danger: 'danger',
    warning: 'primary',
    info: 'primary',
    success: 'primary'
  } as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center pt-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-opacity-10",
          variant === 'danger' && "bg-red-500",
          variant === 'warning' && "bg-yellow-500",
          variant === 'info' && "bg-blue-500",
          variant === 'success' && "bg-green-500"
        )}>
          {icons[variant]}
        </div>
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <div className="text-sm text-gray-400 mb-8">{message}</div>
        
        <div className="flex w-full gap-3">
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={buttonVariants[variant]} 
            className="flex-1" 
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
