import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box, Text } from '../../ink.js';

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right';

type Props = {
  pose?: ClawdPose;
  variant?: 'compact' | 'banner';
};

// Hook for blinking eyes animation
function useBlinkingEyes() {
  const [eyesOpen, setEyesOpen] = useState(true);
  
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyesOpen(prev => !prev);
    }, 2000);
    
    return () => clearInterval(blinkInterval);
  }, []);
  
  return eyesOpen;
}

// Colorful HAWK ASCII art lines with individual character colors
const COLORFUL_HAWK_LINES = [
  { text: '                                     .  .', color: '#FF6B6B' },
  { text: '                                  .  .  .  .', color: '#4ECDC4' },
  { text: '                                  .  |  |  .', color: '#FFE66D' },
  { text: '                               .  |        |  .', color: '#95E1D3' },
  { text: '                               .              .', color: '#C7CEEA' },
  { text: ' ___     ___    _________    . |  (\\.|\\/|./)  | .   ___   ____', color: '#FF6B6B' },
  { text: '|   |   |   |  /    _    \\   .   (\\ |||||| /)   .  |   | /   /', color: '#4ECDC4' },
  { text: '|   |___|   | |    /_\\    |  |  (\\  |/  \\|  /)  |  |   |/   /', color: '#FFE66D' },
  { text: '|           | |           |    (\\            /)    |       /', color: '#95E1D3' },
  { text: '|    ___    | |    ___    |   (\\              /)   |       \\', color: '#C7CEEA' },
  { text: '|   |   |   | |   |   |   |    \\      \/      /    |   |\\   \\', color: '#FF6B6B' },
  { text: '|___|   |___| |___|   |___|     \\____/\\/\\____/     |___| \\___\\', color: '#4ECDC4' },
  { text: '                                    |0\\/0|', eyeLine: true },
  { text: '                                     \\/\\/', color: '#FFE66D' },
  { text: '                                      \\/', color: '#95E1D3' },
];

export function Clawd({ pose = 'default', variant = 'compact' }: Props) {
  const eyesOpen = useBlinkingEyes();
  
  if (variant === 'banner') {
    return (
      <Box flexDirection="column" alignItems="flex-start">
        {COLORFUL_HAWK_LINES.map((line, i) => {
          if (line.eyeLine) {
            // Special rendering for eyes with blinking
            return (
              <Text key={i}>
                {'                                    |'}
                <Text color={eyesOpen ? '#FF6B6B' : '#2C3E50'}>{eyesOpen ? '●' : '○'}</Text>
                {'\\/'}
                <Text color={eyesOpen ? '#4ECDC4' : '#2C3E50'}>{eyesOpen ? '●' : '○'}</Text>
                {'|'}
              </Text>
            );
          }
          return (
            <Text key={i} color={line.color}>
              {line.text}
            </Text>
          );
        })}
      </Box>
    );
  }

  return null;
}

export default Clawd;
