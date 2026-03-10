#!/usr/bin/env python3
"""
Mr. Stix's Dance Performance
A mesmerizing display of stick figure choreography
"""

import time
import os
import sys

# Dance frames - The choreography of Mr. Stix
frames = [
    # Frame 1 - Opening stance
    """
    O
    |
   / \\
  /   \\
    """,
    # Frame 2 - Left arm up
    """
    O
   /|
  / \\
 /   \\
    """,
    # Frame 3 - Both arms up (celebration)
    """
    O
   /|\\
  / | \\
 /  |  \\
    """,
    # Frame 4 - Right arm up, left down
    """
    O
    |\\
   / \\
  /   \\
    """,
    # Frame 5 - Crossed arms cool pose
    """
    O
   \\|/
   / \\
  /   \\
    """,
    # Frame 6 - Jump! (legs bent)
    """
    O
   /|\\
   / \\
  ^   ^
    """,
    # Frame 7 - Landing crouch
    """
    O
   /|\\
  / | \\
 ^  |  ^
    """,
    # Frame 8 - Back to stance
    """
    O
    |
   / \\
  /   \\
    """
]

def clear_screen():
    """Clear the terminal screen"""
    os.system('clear' if os.name == 'posix' else 'cls')

def dance_performance(cycles=3, frame_duration=0.5):
    """
    Execute Mr. Stix's dance performance
    
    Args:
        cycles: Number of complete dance cycles
        frame_duration: Time to display each frame (seconds)
    """
    print("🎭 MR. STIX PRESENTS: THE DANCE 🎭")
    print("=" * 40)
    time.sleep(1)
    
    try:
        for cycle in range(cycles):
            print(f"\\n🎵 CYCLE {cycle + 1} OF {cycles} 🎵")
            
            for i, frame in enumerate(frames):
                clear_screen()
                print("🎭 MR. STIX'S DANCE PERFORMANCE 🎭")
                print("=" * 40)
                print(f"Cycle: {cycle + 1}/{cycles} | Frame: {i + 1}/{len(frames)}")
                print(frame)
                print("=" * 40)
                print("Press Ctrl+C to stop the show...")
                time.sleep(frame_duration)
        
        # Final bow
        clear_screen()
        print("🎭 PERFORMANCE COMPLETE 🎭")
        print("=" * 40)
        final_bow = """
    O     <- *Mr. Stix takes a bow*
   /|\\
  / | \\
 /  |  \\
        """
        print(final_bow)
        print("=" * 40)
        print("Thank you for watching Mr. Stix dance!")
        print("The show must go on... until it doesn't.")
        
    except KeyboardInterrupt:
        print("\\n\\n🎭 SHOW INTERRUPTED 🎭")
        print("Mr. Stix has left the stage...")

if __name__ == "__main__":
    print("Mr. Stix is warming up...")
    time.sleep(1)
    
    # Let the dance begin
    dance_performance(cycles=3, frame_duration=0.8)