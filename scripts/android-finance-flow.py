"""Exercise real release screens via ADB; save UI and screenshots on failure."""
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

evidence=Path(sys.argv[1]); evidence.mkdir(parents=True,exist_ok=True)

def adb(*args):
    return subprocess.check_output(['adb',*args],text=True)

def ui():
    adb('shell','uiautomator','dump','/sdcard/flow.xml')
    value=adb('shell','cat','/sdcard/flow.xml')
    (evidence/'flow-latest.xml').write_text(value)
    return ET.fromstring(value)

def save(name):
    (evidence/f'{name}.xml').write_text(ET.tostring(ui(),encoding='unicode'))
    adb('shell','screencap','-p',f'/sdcard/{name}.png')
    adb('pull',f'/sdcard/{name}.png',str(evidence/f'{name}.png'))

def match(root,label,edit=False):
    parents={child:parent for parent in root.iter() for child in parent}
    matches=[]
    for node in root.iter('node'):
        if not (node.get('content-desc')==label or node.get('text')==label or
                (not edit and node.get('content-desc','').startswith(label+', tab'))):
            continue
        if edit:
            if node.get('class')!='android.widget.EditText':continue
        else:
            # A screen heading can have the same text as its submit button.
            # Only act on an actual clickable control, never the heading.
            while node is not None and node.get('clickable')!='true':
                node=parents.get(node)
            if node is None:continue
        bounds=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
        if len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]:
            matches.append(node)
    return matches

def find(label,edit=False):
    for attempt in range(9):
        nodes=match(ui(),label,edit)
        if nodes:
            return nodes[0] if edit else nodes[-1]
        # Scroll content, keeping the bottom tab bar untouched.
        adb('shell','input','swipe','530','1450','530','650','400')
        time.sleep(.6)
    raise AssertionError(f'Cannot find {label}')

def tap(label,edit=False):
    node=find(label,edit)
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    time.sleep(.8)

def enter(label,value):
    tap(label,True)
    adb('shell','input','text',value)
    time.sleep(.5)
    node=find(label,True)
    assert node.get('text')==value, f'{label} duplicated or changed: {node.get("text")!r}'

def contains(text):
    for attempt in range(8):
        root=ui()
        if any(text in node.get('text','') or text in node.get('content-desc','') for node in root.iter('node')):
            return
        time.sleep(1)
    raise AssertionError(f'Missing expected UI value {text!r}')

try:
    adb('shell','settings','put','secure','show_ime_with_hard_keyboard','0')
    # Use a stable test display size across old Android images.
    adb('shell','wm','size','1080x1920')
    adb('shell','wm','density','420')
    time.sleep(2)
    enter('Your name','J7Tester')
    enter('Username (optional)','j7tester')
    save('name-entered-once')
    tap('Get Started')
    enter('Monthly salary','100000')
    tap('Continue')
    enter('Current total savings','1000')
    tap('Continue')
    enter('Target price','50000')
    tap('Continue')
    tap('Enter WealthTrack')
    time.sleep(4)
    contains('1,01,000')
    save('initial-101000')
    tap('Expenses')
    tap('Add expense')
    enter('Amount','2500')
    enter('Merchant / Paid To (optional)','Groceries')
    tap('Cash')
    tap('Add Expense')
    tap('Dashboard')
    contains('98,500')
    save('expense-98500')
    tap('Goals')
    contains('Dream Bike')
    contains('more for this dream')
    tap('Save 1000 toward Dream Bike')
    tap('Dashboard')
    contains('98,500')
    contains('97,500')
    save('goal-reserves-1000')
    # Relaunch must retain the exact values and the name.
    adb('shell','am','force-stop','com.profinancer.app')
    adb('shell','am','start','-W','-n','com.profinancer.app/.MainActivity')
    time.sleep(6)
    contains('98,500')
    contains('97,500')
    tap('Profile')
    contains('J7Tester')
    root=ui()
    assert all('J7TesterJ7Tester' not in str(node.attrib) for node in root.iter('node'))
    save('restart-profile')
    (evidence/'FINANCE-FLOW-PASSED.txt').write_text('Name and username entered once. Salary 100000 + savings 1000 = 101000. Expense 2500 => 98500. Goal reservation 1000 => available 97500, cash unchanged. Data persisted after restart.\n')
    print('Android finance flow passed')
except Exception:
    save('finance-flow-failure')
    (evidence/'flow-logcat.txt').write_text(adb('logcat','-d'))
    raise
