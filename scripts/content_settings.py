"""Validated public content; CMS fields are plain text and local raster images."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read_content(name):
    return json.loads((ROOT / 'content' / name).read_text(encoding='utf-8'))

def text(value, maximum=3000):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError('Invalid or empty content text')
    return value.strip()

def image_path(value):
    if not isinstance(value, str) or not re.fullmatch(r'assets/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)', value, re.I):
        raise ValueError('Only local PNG, JPEG and WebP images are allowed')
    candidate = (ROOT / value).resolve()
    if not candidate.is_relative_to((ROOT / 'assets').resolve()) or not candidate.is_file():
        raise ValueError('Image missing or outside public assets')
    return value

SITE = read_content('site.json')
for key in ['title', 'description', 'headline1', 'headline2', 'headline3', 'lead', 'heroAlt']:
    SITE[key] = text(SITE[key])
SITE['hero'] = image_path(SITE['hero'])
CLIENTS = read_content('clients.json')['clients']
if not 1 <= len(CLIENTS) <= 40:
    raise ValueError('Provide between 1 and 40 customer logos')
for client in CLIENTS:
    client['nombre'] = text(client['nombre'], 100)
    client['imagen'] = image_path(client['imagen'])
    if client.get('clase') not in ['logo-transparent', 'logo-transparent logo-biochem']:
        client['clase'] = 'logo-transparent'
SERVICES_CONTENT = {}
for file in sorted((ROOT / 'content/services').glob('*.json')):
    service = json.loads(file.read_text(encoding='utf-8'))
    if service['page'] != file.stem + '.html':
        raise ValueError('Service filename mismatch')
    for key in ['title', 'description', 'lead', 'summary']:
        service[key] = text(service[key])
    if not 1 <= len(service['photos']) <= 20:
        raise ValueError('Provide between 1 and 20 gallery photos')
    for photo in service['photos']:
        photo['src'] = image_path(photo['src'])
        photo['alt'] = text(photo['alt'], 400)
        photo['caption'] = text(photo['caption'], 250)
    SERVICES_CONTENT[service['page']] = service
