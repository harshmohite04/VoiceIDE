"""
Speech-to-Text module for Voice IDE Orchestrator.
Handles converting spoken words into text using various STT services.
"""
import speech_recognition as sr
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

class SpeechToText:
    def __init__(self, energy_threshold: int = 4000, 
                 pause_threshold: float = 0.8,
                 dynamic_energy_threshold: bool = True):
        """Initialize the speech recognizer with given parameters.
        
        Args:
            energy_threshold: Energy level for considering something as speech.
            pause_threshold: Seconds of non-speaking audio before considering
                            the audio complete.
            dynamic_energy_threshold: Whether to adjust for ambient noise.
        """
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = energy_threshold
        self.recognizer.pause_threshold = pause_threshold
        self.recognizer.dynamic_energy_threshold = dynamic_energy_threshold
        self.microphone = sr.Microphone()
        
        # Adjust for ambient noise
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source)
    
    def listen(self, callback: Callable[[str], None], 
              phrase_time_limit: int = 10) -> None:
        """Start listening for speech and call the callback with the result.
        
        Args:
            callback: Function to call with the recognized text.
            phrase_time_limit: Maximum seconds to listen for a phrase.
        """
        def listen_callback(recognizer, audio):
            try:
                # Recognize speech using Google's speech recognition
                text = recognizer.recognize_google(audio)
                logger.info(f"Recognized: {text}")
                callback(text)
            except sr.UnknownValueError:
                logger.debug("Could not understand audio")
            except sr.RequestError as e:
                logger.error(f"Could not request results; {e}")
        
        # Start listening in the background
        self.stop_listening = self.recognizer.listen_in_background(
            self.microphone, 
            listen_callback,
            phrase_time_limit=phrase_time_limit
        )
    
    def stop(self) -> None:
        """Stop listening for speech."""
        if hasattr(self, 'stop_listening'):
            self.stop_listening()
    
    def listen_once(self, timeout: int = 5) -> Optional[str]:
        """Listen for a single phrase and return the recognized text.
        
        Args:
            timeout: Maximum seconds to wait for speech.
            
        Returns:
            The recognized text, or None if no speech was detected.
        """
        with self.microphone as source:
            logger.info("Listening...")
            try:
                audio = self.recognizer.listen(source, timeout=timeout)
                text = self.recognizer.recognize_google(audio)
                logger.info(f"Recognized: {text}")
                return text
            except sr.WaitTimeoutError:
                logger.debug("No speech detected")
                return None
            except sr.UnknownValueError:
                logger.debug("Could not understand audio")
                return None
            except sr.RequestError as e:
                logger.error(f"Could not request results; {e}")
                return None

    @staticmethod
    def get_available_microphones() -> list:
        """Get a list of available microphones."""
        return sr.Microphone.list_microphone_names()


if __name__ == "__main__":
    # Example usage
    import time
    
    def on_speech(text):
        print(f"You said: {text}")
    
    stt = SpeechToText()
    print("Available microphones:")
    for i, name in enumerate(SpeechToText.get_available_microphones()):
        print(f"{i}: {name}")
    
    print("\nListening... (speak now, press Ctrl+C to stop)")
    stt.listen(on_speech)
    
    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopping...")
        stt.stop()
