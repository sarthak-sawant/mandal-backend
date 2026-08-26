import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe, runOnJS } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

function GaneshaLogo({ width = 90, height = 90, color, darkColor }: { width?: number; height?: number; color?: string; darkColor?: string }) {
  const theme = useTheme();
  const primary = color || theme.primary;
  const primaryDark = darkColor || theme.primaryDark;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      {/* Left ear */}
      <Path d="M 40,35 C 25,35 20,45 25,55 C 30,65 40,65 40,65" fill="none" stroke={primary} strokeWidth={3} strokeLinecap="round" />
      {/* Right ear */}
      <Path d="M 60,35 C 75,35 80,45 75,55 C 70,65 60,65 60,65" fill="none" stroke={primary} strokeWidth={3} strokeLinecap="round" />
      {/* Head / Crown */}
      <Path d="M 42,25 L 50,8 L 58,25 Z" fill={primary} />
      <Path d="M 45,28 L 50,22 L 55,28 Z" fill={primaryDark} opacity={0.85} />
      <Path d="M 38,35 C 38,20 62,20 62,35 C 62,48 50,45 50,55" fill="none" stroke={primary} strokeWidth={4.5} strokeLinecap="round" />
      {/* Trunk */}
      <Path d="M 50,52 C 50,65 62,65 62,75 C 62,82 55,85 50,85 C 45,85 43,82 45,78" fill="none" stroke={primary} strokeWidth={3.5} strokeLinecap="round" />
      {/* Tusk / Tooth */}
      <Path d="M 46,55 L 43,58" fill="none" stroke={primary} strokeWidth={2.5} />
      {/* Modak */}
      <Circle cx={65} cy={75} r={3.5} fill={primaryDark} />
      {/* Tilak */}
      <Path d="M 48,31 Q 50,27 52,31 Z" fill={primaryDark} />
      <Path d="M 46,35 Q 50,33 54,35" fill="none" stroke={primary} strokeWidth={1.5} />
    </Svg>
  );
}

export function AnimatedSplashOverlay({ dismiss = false }: { dismiss?: boolean }) {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const theme = useTheme();

  // Hide the native splash screen on mount
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // When dismiss becomes true, start the fade-out animation
  useEffect(() => {
    if (dismiss) {
      setAnimate(true);
    }
  }, [dismiss]);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      opacity: 1,
    },
    100: {
      opacity: 0,
    },
  });

  const image = <GaneshaLogo width={120} height={120} color="#FFFFFF" darkColor="rgba(255,255,255,0.7)" />;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          runOnJS(setVisible)(false);
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: theme.primary }]}>
      {image}
    </Animated.View>
  ) : (
    <View style={[styles.splashOverlay, { backgroundColor: theme.primary }]}>
      {image}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  const theme = useTheme();
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={[styles.background, { backgroundColor: theme.primary }]} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <GaneshaLogo width={76} height={71} color="#FFFFFF" darkColor="rgba(255,255,255,0.7)" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  background: {
    borderRadius: 40,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
