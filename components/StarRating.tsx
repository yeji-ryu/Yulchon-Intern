'use client';

import { useState } from 'react';

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
};

export default function StarRating({
  value,
  onChange,
  readOnly = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fillPercent = Math.max(
            0,
            Math.min(100, (displayValue - (star - 1)) * 100)
          );

          return (
            <div
              key={star}
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                display: 'inline-block',
              }}
            >
              {!readOnly && (
                <>
                  <button
                    type="button"
                    aria-label={`${star - 0.5}점`}
                    onMouseEnter={() => setHoverValue(star - 0.5)}
                    onMouseLeave={() => setHoverValue(null)}
                    onClick={() => onChange?.(star - 0.5)}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '50%',
                      height: '100%',
                      zIndex: 10,
                      opacity: 0,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`${star}점`}
                    onMouseEnter={() => setHoverValue(star)}
                    onMouseLeave={() => setHoverValue(null)}
                    onClick={() => onChange?.(star)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      width: '50%',
                      height: '100%',
                      zIndex: 10,
                      opacity: 0,
                      cursor: 'pointer',
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                    }}
                  />
                </>
              )}

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  fontSize: '30px',
                  lineHeight: '36px',
                  textAlign: 'center',
                  color: '#d1d5db',
                  userSelect: 'none',
                }}
              >
                ★
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${fillPercent}%`,
                  overflow: 'hidden',
                  fontSize: '30px',
                  lineHeight: '36px',
                  textAlign: 'center',
                  color: '#f59e0b',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                ★
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          minWidth: '42px',
          fontSize: '18px',
          fontWeight: 700,
          color: '#0f172a',
        }}
      >
        {value.toFixed(1)}
      </div>
    </div>
  );
}