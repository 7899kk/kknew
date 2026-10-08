import hashlib
import json
import struct
import sys
import zipfile
from pathlib import Path

apk=Path(sys.argv[1])
with zipfile.ZipFile(apk) as archive:
    assert archive.testzip() is None, 'Corrupt APK ZIP'
    names=archive.namelist()
    assert 'assets/index.android.bundle' in names, 'Standalone app bundle missing'
    architectures={name.split('/')[1] for name in names if name.startswith('lib/')}
    assert architectures == {'armeabi-v7a'}, architectures
    assert len([name for name in names if name.endswith('.wav')]) == 3, 'Payment sounds missing'
    assert any(name.endswith('.SF') and name.startswith('META-INF/') for name in names), 'Legacy v1 signature missing'
    binary=archive.read('AndroidManifest.xml')
    u16=lambda p:struct.unpack_from('<H',binary,p)[0]
    u32=lambda p:struct.unpack_from('<I',binary,p)[0]
    strings=[]
    elements=[]
    offset=8
    while offset<len(binary):
        kind,header,size=struct.unpack_from('<HHI',binary,offset)
        if kind==1:
            count=u32(offset+8)
            flags=u32(offset+16)
            start=u32(offset+20)
            for index in range(count):
                p=offset+start+u32(offset+header+4*index)
                if flags&256:
                    def length8(p):
                        first=binary[p]
                        return (((first&127)<<8)|binary[p+1],p+2) if first&128 else (first,p+1)
                    _,p=length8(p)
                    length,p=length8(p)
                    value=binary[p:p+length].decode('utf8')
                else:
                    length=u16(p)
                    p+=2
                    if length&32768:
                        length=((length&32767)<<16)|u16(p)
                        p+=2
                    value=binary[p:p+length*2].decode('utf-16-le')
                strings.append(value)
        elif kind==258:
            name=strings[u32(offset+20)]
            start=u16(offset+24)
            stride=u16(offset+26)
            count=u16(offset+28)
            attributes={}
            for index in range(count):
                p=offset+16+start+index*stride
                key=strings[u32(p+4)]
                typ=binary[p+15]
                value=u32(p+16)
                attributes[key]=strings[value] if typ==3 else value
            elements.append((name,attributes))
        offset+=size
    manifest=next(attrs for name,attrs in elements if name=='manifest')
    sdk=next(attrs for name,attrs in elements if name=='uses-sdk')
    assert manifest['package']=='com.profinancer.app'
    assert manifest['versionName']=='1.1.3' and manifest['versionCode']==5
    assert sdk['minSdkVersion']==24, sdk
    permissions={attrs['name'] for name,attrs in elements if name=='uses-permission'}
    allowed={'android.permission.INTERNET','android.permission.ACCESS_NETWORK_STATE','android.permission.POST_NOTIFICATIONS','android.permission.VIBRATE','com.profinancer.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'}
    assert permissions<=allowed, 'Unexpected permissions: '+str(permissions-allowed)
    assert any(name=='service' and attrs.get('name')=='expo.modules.moneynotifications.MoneyListener' and attrs.get('permission')=='android.permission.BIND_NOTIFICATION_LISTENER_SERVICE' for name,attrs in elements), 'Automatic capture listener missing'
    print(json.dumps({'manifest':manifest,'sdk':sdk,'permissions':sorted(permissions),'architectures':sorted(architectures),'size_bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest()},indent=2))
