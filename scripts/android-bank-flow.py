"""Exercise real emulator SMS delivery, runtime consent, ledger review, dedup and restart.

Alphanumeric bank senders auto-book. Emulators that accept only phone numbers
exercise the conservative unknown-sender review path; pure Kotlin tests cover
trusted bank templates separately. No app queue injection or debug endpoints.
"""
from pathlib import Path
import re,runpy,time,subprocess
h=runpy.run_path(str(Path(__file__).with_name('android-finance-flow.py')),run_name='helpers')
adb,ui,save,tap,enter,contains,evidence=[h[k] for k in ('adb','ui','save','tap','enter','contains','evidence')]

def start():
    adb('shell','am','start','-W','-n','com.profinancer.app/.MainActivity');time.sleep(6)

def allow_permissions():
    dashboard_seen=False
    for _ in range(12):
        root=ui()
        allow=next((n for n in root.iter('node') if n.get('text','').casefold() in {'allow','while using the app'}),None)
        if allow is not None:
            x1,y1,x2,y2=map(int,re.findall(r'\d+',allow.get('bounds')))
            adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1)
        elif any(n.get('content-desc')=='Open available balance details' for n in root.iter('node')):
            # Use the stable card action rather than the changing visual label.
            # Check twice so a queued notification-consent dialog can appear.
            if dashboard_seen:return
            dashboard_seen=True;time.sleep(1)
        else:
            dashboard_seen=False;time.sleep(1)
    raise AssertionError('SMS permission flow did not return to dashboard')

sender='VM-HDFCBK'
def sms(body):
    global sender
    output=subprocess.run(['adb','emu','sms','send',sender,body],capture_output=True,text=True).stdout
    if 'OK' not in output:
        sender='9876543210'
        output=adb('emu','sms','send',sender,body)
    assert 'OK' in output,output
    time.sleep(8)

def accept_review(kind):
    tap('Activity');tap('Review');tap(kind);tap('Save');time.sleep(2)

def reason(value):
    contains('Money debited')
    tap('Reason',True);ui()
    adb('shell','input','text',value);time.sleep(.5)
    # Android 7 can report a stale mInputShown flag with a hardware keyboard.
    # Back then closes the app dialog. Submit the single-line field with Enter
    # to dismiss its keyboard while preserving the explicit OK save action.
    node=h['find']('Reason',True)
    assert node.get('text')==value, 'Debit reason was not entered exactly once'
    adb('shell','input','keyevent','66');time.sleep(.8)
    contains('Money debited');save('sms-reason-entered-'+value.lower())
    tap('OK');time.sleep(1)

try:
    adb('shell','pm','clear','com.profinancer.app');start()
    adb('shell','wm','size','1080x1920');adb('shell','wm','density','420')
    enter('Your name','Arun');enter('Username (optional)','arun');tap('Get Started')
    enter('Monthly salary','50000');tap('Continue')
    enter('Current total savings','20000');tap('Continue')
    enter('Target price','250000');tap('Continue');tap('Enter WealthTrack');time.sleep(3)
    contains('Track payments');save('sms-branded-consent')
    tap('Enable SMS');allow_permissions();contains('70,000');save('sms-permission-enabled')
    sms('INR 10,000 credited to A/c XX1234. Avl Bal INR 90,000. UTR: TEST100001')
    tap('Activity')
    review_mode=any('Needs review' in n.get('text','') for n in ui().iter('node'))
    if review_mode:
        tap('Dashboard');contains('70,000');accept_review('Income')
    tap('Dashboard')
    contains('80,000');save('sms-credit-80000')
    sms('INR 10,000 credited to A/c XX1234. Avl Bal INR 90,000. UTR: TEST100001')
    contains('80,000')
    # Another bank alert can describe the same money with a different reference.
    sms('INR 10,000 credited to A/c XX1234. Available balance INR 90,000. UTR: TEST100002')
    tap('Activity');contains('Needs review')
    if not review_mode:contains('Possible duplicate')
    tap('Dismiss');tap('Dashboard');contains('80,000');save('sms-repeat-held-outside-totals')
    # The same amount with a changed bank balance is a genuine second credit.
    sms('INR 10,000 credited to A/c XX1234. Avl Bal INR 100,000. UTR: TEST100003')
    if review_mode:accept_review('Income')
    tap('Dashboard');contains('90,000')
    sms('INR 10,000 credited to A/c XX1234. Avl Bal INR 100,000. UTR: TEST100003')
    contains('90,000');save('sms-separate-credit-counted-once')
    sms('INR 900 debited from account XX1234. Transaction failed. UTR: FAIL900001')
    sms('INR 800 debited from account XX1234. Payment pending. UTR: PEND800001')
    sms('INR 600 debited from account XX1234. Status: FAILURE. UTR: FAIL600001')
    sms('OTP 123456 to pay INR 700 from A/c XX1234')
    contains('90,000');tap('Activity')
    assert not any('Needs review' in n.get('text','') for n in ui().iter('node')),'Failed/pending/OTP message entered review'
    tap('Dashboard');save('sms-failures-excluded')
    sms('INR 1,500 debited from A/c XX1234. Avl Bal INR 88,500. UTR: TEST150001')
    if not any(n.get('text')=='Money debited' for n in ui().iter('node')):accept_review('Expense')
    reason('Groceries');tap('Dashboard');contains('88,500');save('sms-debit-reason')
    adb('shell','input','keyevent','3')
    sms('INR 500 debited from A/c XX1234. Avl Bal INR 88,000. UTR: TEST500001')
    start()
    if not any(n.get('text')=='Money debited' for n in ui().iter('node')):accept_review('Expense')
    reason('Fuel');tap('Dashboard');contains('88,000');save('sms-background-capture')
    adb('shell','am','force-stop','com.profinancer.app');start()
    contains('88,000');tap('Activity');contains('Fuel');save('sms-restart-persisted')
    (evidence/'BANK-FLOW-PASSED.txt').write_text(f'Real SMS runtime consent and receiver on sender {sender}. Two real 10000 credits, exact duplicates ignored, ambiguous alternate bank alert held for review, failed/pending/OTP excluded, 1500 debit + Groceries and background 500 debit + Fuel, 88000 persisted after restart. Review required: {review_mode}. Uncertain senders stayed outside totals until confirmation; trusted templates tested with Kotlin.\n')
    print('Android SMS finance flow passed')
except Exception:
    save('sms-flow-failure');(evidence/'sms-flow-logcat.txt').write_text(adb('logcat','-d'));raise
