/**
 * Tooltip Component
 * Lightweight, accessible tooltip for explaining UI elements
 */

import { ReactNode } from 'react';
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
  return (
    <span className="tooltip-wrapper" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {children || (icon && <HelpCircle size={14} style={{ color: 'var(--color-text-muted)', cursor: 'help' }} />)}
      <span className={`tooltip-content tooltip-${position}`} style={{
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        fontSize: '0.8rem',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        opacity: 0,
        visibility: 'hidden',
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
      <style>{`
        .tooltip-wrapper:hover .tooltip-content {
          opacity: 1;
          visibility: visible;
        }
      `}</style>
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

