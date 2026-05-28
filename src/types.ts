export interface TimestampedWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionConfig {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  animationStyle: 'none' | 'highlight' | 'pop' | 'fade' | 'bounce';
  position: 'top' | 'bottom' | 'center';
  textAlign: 'left' | 'center' | 'right';
  fontWeight: string;
  shadow: boolean;
  uppercase: boolean;
  displayMode: 'text' | 'pill';
  rotate: number;
  displayRange: 'single' | 'phrase';
  positionX: number;
  positionY: number;
}
