export type CapturedPayment = { id: string; amount: number; kind: 'expense' | 'income' | 'transfer' | 'review'; source: string; timestamp: number; reference?: string | null };
export const sourceNames: Record<string,string> = {
  'com.phonepe.app': 'PhonePe', 'net.one97.paytm': 'Paytm',
  'com.google.android.apps.nbu.paisa.user': 'Google Pay', 'in.org.npci.upiapp': 'BHIM',
  'com.sbi.SBIFreedomPlus': 'SBI', 'com.csam.icici.bank.imobile': 'ICICI',
  'com.snapwork.hdfc': 'HDFC', 'com.axis.mobile': 'Axis',
};
