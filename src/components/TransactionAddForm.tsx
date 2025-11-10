import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Sparkles } from 'lucide-react';

interface TransactionAddFormProps {
  selectedPartyName: string;
  partySuggestions: string[];
  onTransactionAdded?: (payload?: any) => Promise<void> | void;
  disabled?: boolean;
}

const TransactionAddForm: React.FC<TransactionAddFormProps> = ({
  selectedPartyName,
  partySuggestions,
  onTransactionAdded,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [counterParty, setCounterParty] = useState('');
  const [amount, setAmount] = useState('');
  const [tnsType, setTnsType] = useState<'CR' | 'DR'>('CR');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [inlineSuggestion, setInlineSuggestion] = useState('');
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const remarksRef = useRef<HTMLInputElement>(null);
  const [typedWidth, setTypedWidth] = useState(0);
  const [inputPadding, setInputPadding] = useState(0);

  const normalizedSelected = selectedPartyName.trim().toLowerCase();
  const quickAmountPresets = useMemo(() => [500, 1000, 5000, 10000], []);

  const uniqueSuggestions = useMemo(
    () =>
      Array.from(new Set(partySuggestions.map(name => name.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [partySuggestions],
  );

  const filteredSuggestions = useMemo(() => {
    const search = counterParty.trim().toLowerCase();
    return uniqueSuggestions.filter(name => {
      const normalized = name.toLowerCase();
      if (normalized === normalizedSelected) return false;
      if (!search) return true;
      return normalized.includes(search);
    });
  }, [counterParty, uniqueSuggestions, normalizedSelected]);

  useEffect(() => {
    const trimmed = counterParty.trim();
    if (!trimmed) {
      setInlineSuggestion('');
      setHighlightedIndex(-1);
      return;
    }

    const firstMatch = uniqueSuggestions.find(name => {
      const normalized = name.toLowerCase();
      return normalized !== normalizedSelected && normalized.startsWith(trimmed.toLowerCase());
    });
    if (firstMatch && firstMatch.length > trimmed.length) {
      setInlineSuggestion(firstMatch);
    } else {
      setInlineSuggestion('');
    }
  }, [counterParty, uniqueSuggestions, normalizedSelected]);

  useEffect(() => {
    if (measureRef.current) {
      setTypedWidth(measureRef.current.offsetWidth);
    } else {
      setTypedWidth(0);
    }
  }, [counterParty]);

  useEffect(() => {
    if (inputRef.current) {
      const styles = window.getComputedStyle(inputRef.current);
      const paddingLeft = parseFloat(styles.paddingLeft || '0');
      setInputPadding(Number.isFinite(paddingLeft) ? paddingLeft : 0);
    }
  }, []);

  const resetForm = () => {
    setCounterParty('');
    setAmount('');
    setTnsType('CR');
    setRemarks('');
    setHighlightedIndex(-1);
    setInlineSuggestion('');
    inputRef.current?.focus();
  };

  const applySuggestion = useCallback((value: string) => {
    setCounterParty(value);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setInlineSuggestion('');
    setTimeout(() => amountRef.current?.focus(), 0);
  }, []);

  const applyQuickAmount = useCallback(
    (value: number) => {
      const sanitized = Number(value);
      if (Number.isNaN(sanitized) || sanitized <= 0) return;
      const prefix = tnsType === 'DR' ? '-' : '';
      setAmount(`${prefix}${sanitized}`);
      setTimeout(() => remarksRef.current?.focus(), 0);
    },
    [tnsType],
  );

  const handleCounterKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions && ['ArrowDown', 'ArrowUp', 'Tab'].includes(event.key)) {
      setShowSuggestions(true);
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev + 1;
        return next >= filteredSuggestions.length ? filteredSuggestions.length - 1 : next;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev - 1;
        return next < 0 ? -1 : next;
      });
    } else if (event.key === 'Enter') {
      const hasSelection = highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length;
      const suggestion = hasSelection ? filteredSuggestions[highlightedIndex] : inlineSuggestion;
      if (suggestion && suggestion.toLowerCase() !== normalizedSelected) {
        event.preventDefault();
        applySuggestion(suggestion);
      } else {
        event.preventDefault();
        setShowSuggestions(false);
        amountRef.current?.focus();
      }
    } else if (event.key === 'Tab') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        event.preventDefault();
        applySuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setInlineSuggestion('');
    }
  };

  const toggleTransactionType = useCallback(() => {
    setTnsType(prev => {
      const next = prev === 'CR' ? 'DR' : 'CR';
      if (amount) {
        const numeric = Math.abs(parseFloat(amount.replace(/^[-+]/, '')));
        if (!Number.isNaN(numeric) && numeric > 0) {
          setAmount(`${next === 'DR' ? '-' : ''}${numeric}`);
        }
      }
      return next;
    });
  }, [amount]);

  const handleAmountKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (remarksRef.current) {
        remarksRef.current.focus();
      } else {
        handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleRemarksKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const isSelfTransaction = counterParty.trim().toLowerCase() === normalizedSelected;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPartyName) {
      toast({
        title: 'No Party Selected',
        description: 'Select a party from the left list before adding transactions.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedCounterParty = counterParty.trim();
    if (!trimmedCounterParty) {
      toast({
        title: 'Counter-party Required',
        description: 'Please enter the party you transacted with.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedCounterParty.toLowerCase() === normalizedSelected) {
      toast({
        title: 'Invalid Party',
        description: 'A party cannot transact with itself. Choose a different counter-party.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedAmount = amount.trim();
    const sign = normalizedAmount.startsWith('-') ? -1 : 1;
    const numericPart = normalizedAmount.replace(/^[-+]/, '');
    const parsedAmount = parseFloat(numericPart);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Enter an amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedRemarks = remarks.trim();
    const finalTnsType = sign < 0 ? 'DR' : 'CR';

    setLoading(true);
    try {
      const payload = {
        partyName: selectedPartyName,
        involvedParty: trimmedCounterParty,
        amount: parsedAmount,
        tnsType: finalTnsType,
        credit: finalTnsType === 'CR' ? parsedAmount : 0,
        debit: finalTnsType === 'DR' ? parsedAmount : 0,
        date: new Date().toISOString().split('T')[0],
        remarks: trimmedRemarks,
        ti: `GROUP_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };

      const response = await partyLedgerAPI.addEntry(payload);

      if (!response.success) {
        toast({
          title: 'Error',
          description: response.message || 'Failed to add transaction.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Transaction Added',
        description: `${selectedPartyName} ↔ ${trimmedCounterParty} recorded successfully.`,
      });

      resetForm();
      const refreshResult = onTransactionAdded?.(response.data);
      if (refreshResult && typeof (refreshResult as Promise<any>).catch === 'function') {
        (refreshResult as Promise<any>).catch(error => {
          console.error('❌ Failed to refresh after adding transaction:', error);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to add transaction:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add transaction.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = !selectedPartyName || loading || isSelfTransaction || disabled;
  const derivedTypeLabel = tnsType === 'CR' ? 'Credit • You Receive' : 'Debit • You Pay';
  const derivedBadgeVariant = tnsType === 'CR' ? 'default' : 'destructive';

  return (
    <form
      onSubmit={handleSubmit}
      className="relative bg-white border border-gray-200 rounded-2xl shadow-xl p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-indigo-50 opacity-70" />
      <div className="pointer-events-none absolute inset-0 border border-white/40 rounded-2xl" />
      <div className="relative md:col-span-2 lg:col-span-5 -mt-1 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          <Sparkles className="w-4 h-4" />
          <span>Quick Transaction Entry</span>
        </div>
        <Badge variant={derivedBadgeVariant} className="text-xs">
          {derivedTypeLabel}
        </Badge>
      </div>

      <div className="relative flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-600">Counter-party</label>
        <div className="relative">
          <span
            ref={measureRef}
            className="absolute top-0 left-0 invisible whitespace-pre text-sm"
            style={{ fontFamily: 'inherit' }}
          >
            {counterParty}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={counterParty}
            onChange={e => {
              setCounterParty(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            onKeyDown={handleCounterKeyDown}
            placeholder="e.g. Give Traders"
            className={`relative z-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isSelfTransaction ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
            disabled={!selectedPartyName || loading || disabled}
            autoComplete="off"
          />
          {inlineSuggestion &&
            counterParty.trim() &&
            inlineSuggestion.toLowerCase().startsWith(counterParty.trim().toLowerCase()) &&
            inlineSuggestion.toLowerCase() !== normalizedSelected && (
              <span
                className="pointer-events-none absolute inset-y-0 flex items-center text-sm text-gray-400"
                style={{ left: inputPadding + typedWidth }}
              >
                {inlineSuggestion.substring(counterParty.trim().length)}
              </span>
            )}
        </div>
        {isSelfTransaction && (
          <span className="text-xs text-red-500">
            Current party cannot transact with itself. Choose a different counter-party.
          </span>
        )}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto transaction-party-dropdown-container">
            {filteredSuggestions.map((name, index) => {
              const lower = counterParty.trim().toLowerCase();
              const lowerName = name.toLowerCase();
              const matchIndex = lower ? lowerName.indexOf(lower) : 0;
              const before = matchIndex > 0 ? name.substring(0, matchIndex) : '';
              const matchText = lower ? name.substring(matchIndex, matchIndex + lower.length) : '';
              const after = lower ? name.substring(matchIndex + lower.length) : name;

              return (
                <div
                  key={name}
                  className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                    index === highlightedIndex ? 'bg-blue-100 text-blue-900' : 'hover:bg-blue-50'
                  }`}
                  onMouseDown={() => applySuggestion(name)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {lower ? (
                    <span>
                      {before}
                      <span className="font-semibold">{matchText}</span>
                      {after}
                    </span>
                  ) : (
                    name
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative flex flex-col gap-2">
        <label className="text-xs font-semibold text-gray-600">Amount</label>
        <input
          ref={amountRef}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={e => {
            const rawValue = e.target.value;
            let sanitized = rawValue.replace(/[^0-9+\-\.]/g, '');
            sanitized = sanitized.replace(/(?!^)[+-]/g, '');
            setAmount(sanitized);
            const trimmed = sanitized.trim();
            if (!trimmed) {
              setTnsType('CR');
              return;
            }
            if (trimmed.startsWith('-')) {
              setTnsType('DR');
            } else {
              setTnsType('CR');
            }
          }}
          onKeyDown={handleAmountKeyDown}
          placeholder="+1000 for credit, -500 for debit"
          className="relative z-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!selectedPartyName || loading || disabled}
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleTransactionType}
            disabled={loading || disabled || !selectedPartyName}
            className="text-xs"
          >
            <ArrowRightLeft className="w-3 h-3 mr-1" />
            Switch to {tnsType === 'CR' ? 'Debit' : 'Credit'}
          </Button>
          <div className="flex flex-wrap gap-1">
            {quickAmountPresets.map(preset => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => applyQuickAmount(preset)}
                disabled={loading || disabled || !selectedPartyName}
                className="text-xs"
              >
                {tnsType === 'CR' ? '+' : '-'}₹{preset.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-2 lg:col-span-1 md:col-span-2">
        <label className="text-xs font-semibold text-gray-600">Remarks</label>
        <input
          ref={remarksRef}
          type="text"
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          onKeyDown={handleRemarksKeyDown}
          placeholder="Optional notes or reference"
          className="relative z-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!selectedPartyName || loading || disabled}
        />
      </div>

      <div className="relative flex items-end lg:col-span-1 md:col-span-2">
        <Button type="submit" disabled={isFormDisabled} className="w-full">
          {loading ? 'Saving…' : 'Add Transaction'}
        </Button>
      </div>

      {!selectedPartyName && (
        <p className="relative text-xs text-red-500 mt-2 lg:col-span-5">
          Select a party from the left panel to start adding transactions.
        </p>
      )}
      {isSelfTransaction && (
        <p className="relative text-xs text-red-500 lg:col-span-5">
          Current party cannot transact with itself. Choose a different counter-party.
        </p>
      )}
    </form>
  );
};

export default TransactionAddForm;
