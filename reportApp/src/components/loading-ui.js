import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const QUOTES = [
  "Finding the best animal responders...",
  "Loading the rescue map...",
  "Getting the dispatch ready...",
  "Connecting to nearby NGOs..."
];

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const AnimatedLetter = ({ char, index, isVisible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 300,
        delay: isVisible ? index * 30 : index * 10, 
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 5,
        duration: 300,
        delay: isVisible ? index * 30 : index * 10,
        useNativeDriver: true,
      })
    ]).start();
  }, [isVisible]);

  return (
    <Animated.Text style={[styles.charText, { opacity, transform: [{ translateY }] }]}>
      {char}
    </Animated.Text>
  );
};

const StaggeredText = ({ text, isVisible }) => {
  const words = text.split(' ');
  let charIndex = 0;

  return (
    <View style={styles.textWrapper}>
      {words.map((word, wIdx) => {
        const wordChars = word.split('');
        const renderedWord = (
          <View key={`word-${wIdx}`} style={styles.wordRow}>
            {wordChars.map((char) => {
              const currentIndex = charIndex++;
              return (
                <AnimatedLetter
                  key={`char-${currentIndex}`}
                  char={char}
                  index={currentIndex}
                  isVisible={isVisible}
                />
              );
            })}
            {wIdx < words.length - 1 && <Text style={styles.charText}> </Text>}
          </View>
        );
        if (wIdx < words.length - 1) charIndex++; 
        return renderedWord;
      })}
    </View>
  );
};

export default function LoadingScreen() {
  const [shuffledQuotes] = useState(() => shuffleArray(QUOTES));
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        
        setQuoteIndex((prevIndex) => (prevIndex + 1) % shuffledQuotes.length);
        setIsVisible(true); 
      }, 1000); 

    }, 3500); 

    return () => clearInterval(interval);
  }, [shuffledQuotes.length]);

  return (
    <View style={styles.container}>
      <StaggeredText 
        key={quoteIndex} 
        text={shuffledQuotes[quoteIndex]} 
        isVisible={isVisible} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordRow: {
    flexDirection: 'row',
  },
  charText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
});