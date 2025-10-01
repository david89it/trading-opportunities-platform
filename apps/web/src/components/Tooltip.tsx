/**
 * Tooltip Component
 * Lightweight, accessible tooltip for explaining UI elements
 */

import { ReactNode, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  icon?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  icon = false,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (icon && <HelpCircle size={14} style={{ color: 'var(--color-text-muted)', cursor: 'help' }} />)}
      <span style={{
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        transition: 'opacity 0.2s ease, visibility 0.2s ease',
        pointerEvents: 'none',
        zIndex: 1000,
        ...(position === 'top' && {
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }),
        ...(position === 'bottom' && {
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }),
        ...(position === 'left' && {
          right: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
        }),
        ...(position === 'right' && {
          left: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
        }),
      }}>
        {content}
        {/* Arrow */}
        <span style={{
          content: '""',
          position: 'absolute',
          width: 0,
          height: 0,
          borderStyle: 'solid',
          ...(position === 'top' && {
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '6px 6px 0 6px',
            borderColor: 'rgba(0, 0, 0, 0.9) transparent transparent transparent',
          }),
          ...(position === 'bottom' && {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '0 6px 6px 6px',
            borderColor: 'transparent transparent rgba(0, 0, 0, 0.9) transparent',
          }),
          ...(position === 'left' && {
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '6px 0 6px 6px',
            borderColor: 'transparent transparent transparent rgba(0, 0, 0, 0.9)',
          }),
          ...(position === 'right' && {
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '6px 6px 6px 0',
            borderColor: 'transparent rgba(0, 0, 0, 0.9) transparent transparent',
          }),
        }} />
      </span>
    </span>
  );
};

export const TooltipLabel: React.FC<{ label: string; tooltip: string; position?: 'top' | 'bottom' | 'left' | 'right' }> = ({
  label,
  tooltip,
  position = 'top',
}) => {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      {label}
      <Tooltip content={tooltip} icon position={position} />
    </span>
  );
};

