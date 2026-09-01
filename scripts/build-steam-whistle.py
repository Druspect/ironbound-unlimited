#!/usr/bin/env python3
"""Build Ironbound's deterministic, license-free multi-chime steam whistle."""

from array import array
import math
from pathlib import Path
import random
import wave


SAMPLE_RATE = 44_100
DURATION = 2.45
OUTPUT = Path(__file__).resolve().parents[1] / "public/assets/audio/ironbound-steam-whistle.wav"


def envelope(time: float) -> float:
    attack = min(1.0, time / 0.075)
    release = min(1.0, max(0.0, (DURATION - time) / 0.62))
    return math.sin(attack * math.pi / 2) ** 2 * math.sin(release * math.pi / 2) ** 2


def build() -> None:
    random.seed(4501)
    frequencies = (293.66, 369.99, 440.0, 587.33)
    phases = [random.random() * math.tau for _ in frequencies]
    samples: list[float] = []
    steam_slow = 0.0
    steam_fast = 0.0

    for index in range(round(SAMPLE_RATE * DURATION)):
        time = index / SAMPLE_RATE
        pressure = envelope(time) * (0.96 + 0.035 * math.sin(math.tau * 2.7 * time))
        pitch_rise = 0.978 + 0.022 * min(1.0, time / 0.32)
        chimes = 0.0
        for chime, (frequency, phase) in enumerate(zip(frequencies, phases)):
            vibrato = 1 + 0.0018 * math.sin(math.tau * (3.5 + chime * 0.19) * time + phase)
            angle = math.tau * frequency * pitch_rise * vibrato * time + phase
            chimes += (math.sin(angle) + 0.24 * math.sin(2 * angle + 0.31) + 0.09 * math.sin(3 * angle + 0.7)) / (1 + chime * 0.16)

        noise = random.uniform(-1.0, 1.0)
        steam_slow += 0.012 * (noise - steam_slow)
        steam_fast += 0.18 * (noise - steam_fast)
        air = steam_fast - steam_slow
        valve_crack = math.exp(-time * 19) + 0.28 * math.exp(-max(0.0, DURATION - time) * 8)
        samples.append(pressure * (0.155 * chimes + (0.07 + 0.12 * valve_crack) * air))

    dry = samples[:]
    for delay_seconds, gain in ((0.087, 0.18), (0.173, 0.11), (0.307, 0.055)):
        delay = round(delay_seconds * SAMPLE_RATE)
        for index in range(delay, len(samples)):
            samples[index] += dry[index - delay] * gain

    peak = max(abs(sample) for sample in samples) or 1
    pcm = array("h", (round(max(-1, min(1, sample / peak * 0.86)) * 32767) for sample in samples))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm.tobytes())


if __name__ == "__main__":
    build()
