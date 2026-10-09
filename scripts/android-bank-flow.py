"""Actual notification listener test using an isolated mock bank on an emulator.

The fixture uses a supported package ID only in CI, never real bank messages or
accounts. It posts Android notifications: no direct JS/native queue injection.
"""
from pathlib import Path
import re,runpy,shlex,time

helpers=runpy.run_path(str(Path(__file__).with_name('android-finance-flow.py')),run_name='helpers')
adb,ui,save,tap,enter,contains,evidence=[helpers[key] for key in ('adb','ui','save','tap','enter','contains','evidence')]

def start():
    adb('shell','am','start','-W','-n','com.profinancer.app/.MainActivity')
    time.sleep(6)

def post(message,number):
    adb('shell','am','start','-n','com.sbi.SBIFreedomPlus/.MockBank','--es','message',shlex.quote(message),'--ei','notificationId',str(number))
    time.sleep(7)  # foreground ledger polls the durable native queue every 5s

def home():
    # Restore the top of a long goal list before changing tabs.
    for _ in range(3): adb('shell','input','swipe','530','650','530','1450','250')

def scroll_contains(text):
    for _ in range(10):
        if any(text in n.get('text','') or text in n.get('content-desc','') for n in ui().iter('node')):
            return
        adb('shell','input','swipe','530','1450','530','650','300');time.sleep(.6)
    raise AssertionError(f'Missing scrollable UI value {text}')

def add_goal(name,target,saved):
    tap('Add goal')
    tap('Custom')
    enter('Goal Name',name)
    enter('Target Amount',str(target))
    enter('Already Saved',str(saved))
    # The submit control can be only partly exposed at the bottom of the modal.
    # Scroll it fully into view, then verify that submission actually closed it.
    adb('shell','input','swipe','530','1450','530','700','300');time.sleep(.8)
    for _ in range(3):
        tap('Create Goal');time.sleep(1)
        if not any(n.get('text')=='New Goal' for n in ui().iter('node')):
            return
    raise AssertionError(f'Goal form did not submit: {name}')

def native_tap(labels):
    for _ in range(5):
        root=ui()
        nodes=[n for n in root.iter('node') if n.get('text','').casefold() in labels or n.get('content-desc','').casefold() in labels]
        if labels=={'add reason'}:
            parents={child:parent for parent in root.iter() for child in parent}
            amounts=[n for n in root.iter('node') if re.search(r'₹\s*500\.00',n.get('text',''))]
            target=amounts[0] if amounts else None
            expanded=False
            while target is not None:
                actions=[n for n in target.iter('node') if n.get('text','').casefold() in labels or n.get('content-desc','').casefold() in labels]
                if actions:
                    nodes=actions
                    break
                expand=[n for n in target.iter('node') if n.get('content-desc','').casefold().startswith('expand')]
                if expand:
                    x1,y1,x2,y2=map(int,re.findall(r'\d+',expand[0].get('bounds')))
                    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1)
                    expanded=True
                    break
                target=parents.get(target)
            if expanded:continue
            if not nodes:
                expand=[n for n in root.iter('node') if n.get('content-desc','').casefold().startswith('expand')]
                if expand:
                    x1,y1,x2,y2=map(int,re.findall(r'\d+',expand[0].get('bounds')))
                    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1)
                    continue
        for node in nodes:
            bounds=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
            if len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]:
                x1,y1,x2,y2=bounds
                adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1)
                return
        time.sleep(1)
    raise AssertionError(f'Native notification control missing: {labels}; visible labels: '+str([(n.get('text'),n.get('content-desc')) for n in ui().iter('node') if n.get('text') or n.get('content-desc')]))

try:
    adb('shell','pm','clear','com.profinancer.app')
    start()
    enter('Your name','Arun')
    enter('Username (optional)','arun')
    tap('Get Started')
    enter('Monthly salary','50000')
    tap('Continue')
    enter('Current total savings','20000')
    tap('Continue')
    enter('Target price','250000')
    tap('Continue');tap('Enter WealthTrack');time.sleep(4)
    contains('70,000')
    tap('Expenses');tap('Add expense')
    enter('Amount','29500');enter('Merchant / Paid To (optional)','Household')
    tap('Cash');tap('Add Expense');tap('Dashboard')
    contains('40,500');save('household-40500')
    tap('Goals');tap('Save 1000 toward Dream Bike');tap('Save 1000 toward Dream Bike')
    add_goal('FamilyCar',1800000,3000)
    add_goal('Villa',10000000,5000)
    home();save('household-dreams')
    tap('Dashboard');contains('40,500');contains('30,500');save('household-reserved-30500')

    adb('install','-r','bank-fixture-build/mock-bank.apk')
    # Exercise the actual Android consent flow rather than writing a secure
    # setting that the OS can revoke during force-stop/service reconciliation.
    tap('Activity');tap('Notification access settings')
    native_tap({'pro financer','pro financer payment tracking'})
    native_tap({'allow','ok'})
    adb('shell','input','keyevent','4');time.sleep(3)
    tap('Capture new payments');contains('Capture: On');tap('Dashboard')
    post('INR 10,000 credited. UTR: TEST100001',101)
    contains('50,500');save('bank-credit-10000')
    post('INR 20,000 credited. UTR: TEST200001',102)
    contains('70,500');contains('60,500');save('bank-credit-20000')
    post('INR 20,000 received. UTR: TEST200001',103)
    contains('70,500')  # same reference/amount: not another credit
    post('INR 1,500 debited. UTR: TEST150001',104)
    contains('Money debited');contains('1,500');save('compact-debit-panel')
    assert len([n for n in ui().iter('node') if n.get('class')=='android.widget.EditText'])==1
    tap('OK');contains('Enter a reason')
    enter('Reason','Groceries');tap('OK')
    contains('69,000');contains('59,000');save('bank-debit-69000')
    # Closing keeps the original expense, with a reason reminder in Activity.
    post('INR 100 debited. UTR: TEST100002',105)
    contains('Money debited');tap('Close debit reason')
    contains('68,900');tap('Activity');scroll_contains('Add payment reasons');tap('Dashboard')

    # A reply from the system notification shade must work while the app is closed.
    adb('shell','input','keyevent','3')
    post('INR 500 debited. UTR: TEST500001',106)
    adb('shell','cmd','statusbar','expand-notifications');time.sleep(2)
    native_tap({'add reason'})
    root=ui()
    inputs=[n for n in root.iter('node') if n.get('class')=='android.widget.EditText']
    assert inputs,'Inline notification reply field missing'
    node=inputs[0];x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    adb('shell','input','text','Fuel');time.sleep(1)
    save('background-inline-reason')
    native_tap({'send','send reply'})
    adb('shell','input','keyevent','4');adb('shell','cmd','statusbar','collapse');start()
    # A warm return retains the X deferral. If Android killed the app meanwhile,
    # the older 100 can prompt again; the replied 500 must never ask again.
    if any(n.get('text')=='Money debited' for n in ui().iter('node')):
        contains('100');tap('Close debit reason')
    contains('68,400');contains('58,400')
    tap('Activity');scroll_contains('Fuel');scroll_contains('Groceries');save('background-reply-saved')
    adb('shell','am','force-stop','com.profinancer.app');start()
    contains('100');tap('Close debit reason')
    contains('68,400');contains('58,400');save('household-restart')
    (evidence/'BANK-FLOW-PASSED.txt').write_text('Real mock Android notifications: 10k and 20k credits add to the household budget; duplicate credit ignored; 1500 debit opens compact reason panel; X preserves 100 debit; 500 debit reason replied from background notification; data and 68400 balance/58400 available persisted. No real bank accounts/messages used.\n')
except Exception:
    save('bank-flow-failure')
    (evidence/'bank-flow-logcat.txt').write_text(adb('logcat','-d'))
    raise
