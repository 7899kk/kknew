"""Exercise real release screens via ADB; save UI and screenshots on failure."""
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

evidence=Path(sys.argv[1]); evidence.mkdir(parents=True,exist_ok=True)

def adb(*args):
    return subprocess.check_output(['adb',*args],text=True,timeout=45)

def ui(attempt=0):
    for retry in range(3):
        try:
            adb('shell','rm','-f','/sdcard/flow.xml')
            adb('shell','uiautomator','dump','/sdcard/flow.xml')
            value=adb('shell','cat','/sdcard/flow.xml')
            ET.fromstring(value)
            break
        except (subprocess.SubprocessError, ET.ParseError):
            if retry==2:raise
            time.sleep(.5)
    (evidence/'flow-latest.xml').write_text(value)
    root=ET.fromstring(value)
    # The stock Android 7 emulator keyboard requests contacts on first use.
    # Deny its request; no app or keyboard contact access is needed for this test.
    if attempt < 3 and 'Android Keyboard (AOSP)' in value:
        deny=next((n for n in root.iter('node') if n.get('text')=='DENY'),None)
        if deny is not None:
            x1,y1,x2,y2=map(int,re.findall(r'\d+',deny.get('bounds')))
            adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
            time.sleep(.8)
            return ui(attempt+1)
    return root

def save(name):
    (evidence/f'{name}.xml').write_text(ET.tostring(ui(),encoding='unicode'))
    adb('shell','screencap','-p',f'/sdcard/{name}.png')
    adb('pull',f'/sdcard/{name}.png',str(evidence/f'{name}.png'))

def match(root,label,edit=False):
    parents={child:parent for parent in root.iter() for child in parent}
    matches=[]
    tabs={'Dashboard','Expenses','Activity','Dues','Goals','Split','Profile'}
    nav_bounds=[]
    for candidate in root.iter('node'):
        if candidate.get('text') not in tabs:continue
        box=list(map(int,re.findall(r'\d+',candidate.get('bounds',''))))
        if len(box)!=4 or box[1]<1500:continue
        control=candidate
        while control is not None and control.get('clickable')!='true':control=parents.get(control)
        if control is not None:
            box=list(map(int,re.findall(r'\d+',control.get('bounds',''))))
            if len(box)==4:nav_bounds.append(box[1])
    # Native Modal forms have no visible tab bar; their bottom buttons remain tappable.
    nav_top=min(nav_bounds) if len(nav_bounds)>=3 else None
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
            # Native accessibility includes partially exposed controls behind the
            # bottom tab bar. Scroll them fully into view before tapping.
            if label not in tabs and nav_top is not None and bounds[3]>nav_top:
                continue
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
    if not edit:
        label={'Home':'Dashboard'}.get(label,label)
        if label=='Loans':
            tap('Dashboard');return tap('Open monthly loan payments')
        if label=='Others':
            tap('Loans');return tap('Payment reminders')
        if label=='Add expense' and match(ui(),'Amount',True):return
    node=find(label,edit)
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    time.sleep(.8)
    if label=='Dashboard':
        adb('shell','input','swipe','530','550','530','1500','350')
        adb('shell','input','swipe','530','550','530','1500','350')
        time.sleep(.4)

def tap_menu(label):
    node=find(label)
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.8)

def tap_filter(label):
    nodes=[n for n in match(ui(),label) if n.get('class')=='android.widget.Button' and int(re.findall(r'\d+',n.get('bounds'))[1])<1500]
    nodes=list({n.get('bounds'):n for n in nodes}.values())
    assert len(nodes)==1, f'Expected one Activity filter {label}, got {len(nodes)}'
    x1,y1,x2,y2=map(int,re.findall(r'\d+',nodes[0].get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.8)

def enter(label,value):
    tap(label,True)
    ui()  # dismiss any stock-keyboard setup prompt before sending text
    adb('shell','input','text',value)
    time.sleep(.5)
    node=find(label,True)
    assert node.get('text')==value, f'{label} duplicated or changed: {node.get("text")!r}'
    keyboard=adb('shell','dumpsys','input_method')
    if re.search(r'mInputShown=true|mIsInputViewShown=true',keyboard):
        # Hardware-keyboard emulators can report a stale IME flag. Back then
        # closes the form. Enter dismisses a single-line field without navigation.
        adb('shell','input','keyevent','66')
        time.sleep(.8)

def contains(text):
    for attempt in range(8):
        root=ui()
        if any(text in node.get('text','') or text in node.get('content-desc','') for node in root.iter('node')):
            return
        adb('shell','input','swipe','530','1450','530','650','400')
        time.sleep(.6)
    raise AssertionError(f'Missing expected UI value {text!r}')

if __name__ == "__main__":
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
        contains('Track payments');tap('Not now')
        contains('1,01,000')
        save('initial-101000')
        tap('Expenses')
        tap('Add expense')
        enter('Amount','2500')
        enter('Merchant / Paid To (optional)','Groceries')
        tap('Cash')
        tap('Add Expense')
        tap('Activity');tap_filter('Expenses')
        assert any(n.get('text','').startswith('−') and '2,500' in n.get('text','') for n in ui().iter('node')), 'Manual expense is missing its debit sign'
        tap_filter('Income')
        assert not any('2,500' in n.get('text','') for n in ui().iter('node')), 'Manual expense appeared under Income'
        tap_filter('All');save('manual-expense-direction')
        tap('Dashboard')
        contains('98,500')
        save('expense-98500')
        tap('Goals')
        contains('Dream Bike')
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
        # Regression: save the previous group-name/member-list form with the
        # real soft keyboard open. One tap must submit instead of swallowing it.
        adb('shell','settings','put','secure','show_ime_with_hard_keyboard','1')
        tap('Split');tap('Create group')
        for field,value in [('Group name','Weekend'),('Members, separated by commas','Arun,%sPriya,%sKarthik')]:
            tap(field,True);ui();adb('shell','input','text',value);time.sleep(.5)
        tap('Save')
        contains('Weekend');contains('Arun, Priya, Karthik');save('group-people-saved-first-tap')
        adb('shell','settings','put','secure','show_ime_with_hard_keyboard','0')
        adb('shell','am','force-stop','com.profinancer.app')
        adb('shell','am','start','-W','-n','com.profinancer.app/.MainActivity');time.sleep(6)
        tap('Split');contains('Weekend');contains('Arun, Priya, Karthik');save('group-people-after-restart')

        tap('Loans');tap('Add loan')
        enter('Loan name','Bike');enter('Lender','Bank')
        enter('Loan amount','12000');enter('Monthly payment (optional)','2000')
        tap('Save loan');tap('Home');contains('95,500');save('loan-monthly-reserve')
        tap('Loans');tap('Open loan Bike');tap('Record repayment')
        # Default amount is the next installment, 2000; no cash transaction is created.
        tap('Save repayment');contains('10,000');tap('Close')
        tap('Home');contains('98,500');contains('97,500');save('loan-paid-cash-unchanged')
        tap('Dues');contains('Bank');contains('10,000');save('loan-linked-dues')
        adb('shell','am','force-stop','com.profinancer.app')
        adb('shell','am','start','-W','-n','com.profinancer.app/.MainActivity');time.sleep(6)
        tap('Loans');contains('Bike');contains('10,000');save('loan-restart-persisted')

        # A real interest-bearing plan and a local notification using its real due record.
        tap('Add loan');enter('Loan name','InterestLoan');enter('Lender','Lender')
        enter('Loan amount','100000');enter('Annual interest (%)','12');enter('Term (months)','12')
        contains('8,884.88');contains('1,06,618.53');save('interest-emi-preview')
        tap('Save loan');tap('Home');contains('88,615.12');save('interest-loan-dashboard')
        tap('Others');tap('Enable reminders')
        for _ in range(5):
            root=ui();allow=next((n for n in root.iter('node') if n.get('text','').casefold()=='allow'),None)
            if allow is None:
                if any(n.get('text')=='Reminders on' for n in root.iter('node')):break
                time.sleep(1);continue
            x1,y1,x2,y2=map(int,re.findall(r'\d+',allow.get('bounds')))
            adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1)
        time.sleep(4)
        tap('Send due reminder now');time.sleep(2)
        notifications=adb('shell','dumpsys','notification','--noredact')
        assert 'Payments due' in notifications and 'InterestLoan EMI' in notifications, 'Real loan reminder notification missing'
        (evidence/'payment-reminder-notification.txt').write_text(notifications)
        alarms=adb('shell','dumpsys','alarm')
        assert 'PaymentReminderReceiver' in alarms, 'Next daily reminder alarm missing'
        (evidence/'payment-reminder-alarm.txt').write_text(alarms)
        save('others-reminders-on')
        tap('Turn off reminders');time.sleep(2)
        active_alarms=adb('shell','dumpsys','alarm').split('Past-due non-wakeup alarms')[0].split('Alarm Stats:')[0].split('Removal history:')[0]
        assert 'PaymentReminderReceiver' not in active_alarms, 'Disabled daily reminder remained scheduled'

        (evidence/'FINANCE-FLOW-PASSED.txt').write_text('Name and username entered once. Salary 100000 + savings 1000 = 101000. Expense 2500 => 98500. Goal reservation 1000 => available 97500, cash unchanged. Data persisted after restart. Loan 12000 reserves monthly 2000, repayment changes dues to 10000 without changing cash; persists on restart.\n')
        print('Android finance flow passed')
    except Exception:
        save('finance-flow-failure')
        (evidence/'flow-logcat.txt').write_text(adb('logcat','-d'))
        raise
