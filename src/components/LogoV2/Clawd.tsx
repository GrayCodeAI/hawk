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
  { text: '                                     .  .', color: 'hawk' },
  { text: '                                  .  .  .  .', color: 'hawk' },
  { text: '                                  .  |  |  .', color: 'hawk' },
  { text: '                               .  |        |  .', color: 'hawk' },
  { text: '                               .              .', color: 'hawk' },
  { text: ' ___     ___    _________    . |  (\\.|\\/|./)  | .   ___   ____', color: 'hawk' },
  { text: '|   |   |   |  /    _    \\   .   (\\ |||||| /)   .  |   | /   /', color: 'hawk' },
  { text: '|   |___|   | |    /_\\    |  |  (\\  |/  \\|  /)  |  |   |/   /', color: 'hawk' },
  { text: '|           | |           |    (\\            /)    |       /', color: 'hawk' },
  { text: '|    ___    | |    ___    |   (\\              /)   |       \\', color: 'hawk' },
  { text: '|   |   |   | |   |   |   |    \\      \\/      /    |   |\\   \\', color: 'hawk' },
  { text: '|___|   |___| |___|   |___|     \\____/\\/\\____/     |___| \\___\\', color: 'hawk' },
  { text: '                                    |0\\/0|', eyeLine: true },
  { text: '                                     \\/\\/', color: 'hawk' },
  { text: '                                      \\/', color: 'hawk' },
];

export function Clawd({ pose = 'default', variant = 'compact' }: Props) {
  const eyesOpen = useBlinkingEyes();
  
  if (variant === 'banner') {
    return (
      <Box flexDirection="column" alignItems="flex-start">
        {COLORFUL_HAWK_LINES.map((line, i) => {
          if (line.eyeLine) {
            const eye = eyesOpen ? '●' : '○';
            return <Text key={i} color="hawk">{`                                    |${eye}\\/${eye}|`}</Text>;
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
