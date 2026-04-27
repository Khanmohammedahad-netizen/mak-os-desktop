"use client";

import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore, WindowState } from '@/stores/windowStore';

interface WindowProps {
  window: WindowState;
  children?: React.ReactNode;
}

export const Window = memo(({ window, children }: WindowProps) => {
  const {
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updatePosition,
    updateSize,
    activeWindowId,
  } = useWindowStore();

  const isFocused = activeWindowId === window.id;
  const dragControls = useDragControls();
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimizingNow, setIsMinimizingNow] = useState(false);

  const x = useMotionValue(window.position.x);
  const y = useMotionValue(window.position.y);

  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (!isDraggingRef.current) {
      x.set(window.position.x);
      y.set(window.position.y);
    }
  }, [window.position.x, window.position.y, x, y]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.pageX;
    const startY = e.pageY;
    const startWidth = window.size.width;
    const startHeight = window.size.height;

    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(400, startWidth + (ev.pageX - startX));
      const newHeight = Math.max(300, startHeight + (ev.pageY - startY));
      updateSize(window.id, { width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimizingNow(true);
    minimizeWindow(window.id);
  };

  const windowStyle = window.isMaximized
    ? {
        left: 0,
        top: 28,
        right: 0,
        bottom: 80,
        width: '100%',
        height: 'calc(100vh - 28px - 80px)',
        zIndex: window.zIndex,
      }
    : {
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex,
      };

  return (
    <AnimatePresence>
      {!window.isMinimized && (
        <motion.div
          key={window.id}
          initial={{ scale: 0.92, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={
            isMinimizingNow
              ? { scale: 0.12, opacity: 0, y: 400, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }
              : { scale: 0.92, opacity: 0, y: 8, transition: { duration: 0.2 } }
          }
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...windowStyle,
            x: window.isMaximized ? 0 : x,
            y: window.isMaximized ? 0 : y,
          }}
          onMouseDown={() => focusWindow(window.id)}
          onContextMenu={(e) => e.stopPropagation()}
          className={cn(
            'fixed glass-window rounded-xl overflow-hidden flex flex-col transition-shadow duration-200',
            isFocused
              ? 'shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(201,168,76,0.18)]'
              : 'shadow-[0_8px_32px_rgba(0,0,0,0.4)] opacity-[0.88]',
            window.isMaximized && 'rounded-none border-x-0 border-b-0'
          )}
          drag={!window.isMaximized && !isResizing}
          dragMomentum={false}
          dragListener={false}
          dragConstraints={false}
          dragControls={dragControls}
          onDragStart={() => { isDraggingRef.current = true; }}
          onDragEnd={() => {
            isDraggingRef.current = false;
            updatePosition(window.id, { x: x.get(), y: y.get() });
          }}
        >
          {/* Title Bar */}
          <div
            className="h-[32px] flex items-center px-3 select-none cursor-default bg-white/5 border-b border-gold/10 flex-shrink-0"
            onPointerDown={(e) => {
              if (!window.isMaximized) dragControls.start(e);
            }}
            onDoubleClick={() => maximizeWindow(window.id)}
          >
            {/* Traffic lights */}
            <div
              className="flex items-center space-x-2 w-[60px]"
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
                className="w-3 h-3 rounded-full bg-os-red flex items-center justify-center group"
              >
                <X size={8} className="opacity-0 group-hover:opacity-100 text-black/50" />
              </button>
              <button
                onClick={handleMinimize}
                className="w-3 h-3 rounded-full bg-os-yellow flex items-center justify-center group"
              >
                <Minus size={8} className="opacity-0 group-hover:opacity-100 text-black/50" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
                className="w-3 h-3 rounded-full bg-os-green flex items-center justify-center group"
              >
                <Square size={8} className="opacity-0 group-hover:opacity-100 text-black/50" />
              </button>
            </div>

            <div className="flex-1 text-center text-[12px] font-medium text-text-secondary">
              {window.title}
            </div>

            <div className="w-[60px]" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-bg-primary/50 min-h-0">
            {children ?? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                  <span className="text-gold text-2xl font-bold">M</span>
                </div>
                <h2 className="text-xl font-display font-semibold text-gold tracking-wide">{window.title}</h2>
                <p className="text-text-secondary text-sm">Application content coming soon…</p>
              </div>
            )}
          </div>

          {/* Resize handle */}
          {!window.isMaximized && (
            <div
              onMouseDown={handleResizeStart}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 z-10"
            >
              <div className="w-2 h-2 border-r border-b border-gold/40 rounded-br-[2px]" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
Window.displayName = 'Window';
