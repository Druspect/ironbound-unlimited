from pathlib import Path

path = Path("app/page.tsx")
text = path.read_text()

old = '              data-brake-cylinder-pressure={brakeCylinderPressureRef.current.toFixed(4)}\n'
assert old in text, "render-time cylinder telemetry anchor missing"
text = text.replace(old, "", 1)

old = '''      const root = experienceRef.current;
      if (root) {
        const fullTilePosition = visualTravelRef.current / TILE_TRAVEL;'''
new = '''      const root = experienceRef.current;
      if (root) {
        root.dataset.brakeLinePressure = brakePressureRef.current.toFixed(4);
        root.dataset.brakeCylinderPressure = brakeCylinderPressureRef.current.toFixed(4);
        const fullTilePosition = visualTravelRef.current / TILE_TRAVEL;'''
assert old in text, "simulation telemetry anchor missing"
text = text.replace(old, new, 1)

path.write_text(text)
