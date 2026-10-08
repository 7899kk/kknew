import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProFinancierHeader } from "@/components/ProFinancierHeader";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PillSelector,
  StatCard,
} from "@/components/UI";
import {
  StockEntry,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  coinNameToGeckoId,
  fetchCryptoPrices,
  fetchMultipleStockPrices,
} from "@/utils/marketData";

function formatCurrency(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
  return `₹${n.toFixed(0)}`;
}

function PnlBadge({ pnl, percent }: { pnl: number; percent: number }) {
  const colors = useColors();
  const positive = pnl >= 0;
  return (
    <View
      style={{
        backgroundColor: positive ? colors.successLight : colors.destructive + "20",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: positive ? colors.success : colors.destructive }}>
        {positive ? "▲" : "▼"} {formatCurrency(Math.abs(pnl))} ({Math.abs(percent).toFixed(2)}%)
      </Text>
    </View>
  );
}

// ─── Stock Form ───────────────────────────────────────────────────────────────
function StockForm({ onClose }: { onClose: () => void }) {
  const { addStock } = useApp();
  const colors = useColors();
  const [company, setCompany] = useState("");
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState<StockEntry["exchange"]>("NSE");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);

  const fetchLivePrice = async () => {
    if (!symbol.trim()) {
      Alert.alert("Enter symbol", "Please enter a stock symbol first.");
      return;
    }
    setLoadingPrice(true);
    const suffix =
      exchange === "NSE" ? ".NS" : exchange === "BSE" ? ".BO" : "";
    const fullSymbol = suffix
      ? `${symbol.trim().toUpperCase()}${suffix}`
      : symbol.trim().toUpperCase();
    const prices = await fetchMultipleStockPrices([fullSymbol]);
    if (prices[fullSymbol]) {
      setCurrentPrice(prices[fullSymbol].price.toFixed(2));
      if (!company.trim() && prices[fullSymbol].name)
        setCompany(prices[fullSymbol].name ?? "");
    } else {
      Alert.alert(
        "Not found",
        "Could not fetch price. Check the symbol and try again."
      );
    }
    setLoadingPrice(false);
  };

  const handleAdd = () => {
    if (!company || !symbol || !quantity || !buyPrice) {
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }
    addStock({
      company,
      symbol: symbol.toUpperCase(),
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      currentPrice: parseFloat(currentPrice) || parseFloat(buyPrice),
      purchaseDate,
      exchange,
    });
    onClose();
  };

  return (
    <View style={{ gap: 12 }}>
      <PillSelector
        options={["NSE", "BSE", "NYSE", "NASDAQ", "Other"]}
        value={exchange ?? "NSE"}
        onChange={(v) => setExchange(v as StockEntry["exchange"])}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Ticker Symbol *"
            value={symbol}
            onChangeText={(t) => setSymbol(t.toUpperCase())}
            placeholder="e.g. RELIANCE"
          />
        </View>
        <TouchableOpacity
          onPress={fetchLivePrice}
          style={{
            marginTop: 22,
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: colors.primary,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 70,
          }}
        >
          {loadingPrice ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
              Live ₹
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <Input
        label="Company Name *"
        value={company}
        onChangeText={setCompany}
        placeholder="e.g. Reliance Industries"
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Quantity *"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="10"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Buy Price (₹) *"
            value={buyPrice}
            onChangeText={setBuyPrice}
            keyboardType="decimal-pad"
            placeholder="2500"
          />
        </View>
      </View>
      <Input
        label="Current Price (₹)"
        value={currentPrice}
        onChangeText={setCurrentPrice}
        keyboardType="decimal-pad"
        placeholder="Auto-filled or enter manually"
      />
      <Input
        label="Purchase Date"
        value={purchaseDate}
        onChangeText={setPurchaseDate}
        placeholder="YYYY-MM-DD"
      />
      <Button title="Add Stock" onPress={handleAdd} />
    </View>
  );
}

// ─── Crypto Form ──────────────────────────────────────────────────────────────
function CryptoForm({ onClose }: { onClose: () => void }) {
  const { addCrypto } = useApp();
  const colors = useColors();
  const [coin, setCoin] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);

  const fetchLivePrice = async () => {
    if (!coin.trim()) {
      Alert.alert("Enter coin name", "Please enter a coin name first.");
      return;
    }
    setLoadingPrice(true);
    const geckoId = coinNameToGeckoId(coin.trim());
    const prices = await fetchCryptoPrices([geckoId]);
    if (prices[geckoId]) {
      setCurrentPrice(prices[geckoId].toFixed(2));
    } else {
      Alert.alert(
        "Not found",
        "Could not fetch price. Try: bitcoin, ethereum, solana, dogecoin..."
      );
    }
    setLoadingPrice(false);
  };

  const handleAdd = () => {
    if (!coin || !quantity || !buyPrice) {
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }
    addCrypto({
      coin,
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      currentPrice: parseFloat(currentPrice) || parseFloat(buyPrice),
      purchaseDate,
    });
    onClose();
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Coin Name *"
            value={coin}
            onChangeText={setCoin}
            placeholder="e.g. Bitcoin"
          />
        </View>
        <TouchableOpacity
          onPress={fetchLivePrice}
          style={{
            marginTop: 22,
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: colors.primary,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 70,
          }}
        >
          {loadingPrice ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
              Live ₹
            </Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Quantity *"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="0.05"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Buy Price (₹) *"
            value={buyPrice}
            onChangeText={setBuyPrice}
            keyboardType="decimal-pad"
            placeholder="40,00,000"
          />
        </View>
      </View>
      <Input
        label="Current Price (₹)"
        value={currentPrice}
        onChangeText={setCurrentPrice}
        keyboardType="decimal-pad"
        placeholder="Auto-filled or enter manually"
      />
      <Input
        label="Purchase Date"
        value={purchaseDate}
        onChangeText={setPurchaseDate}
        placeholder="YYYY-MM-DD"
      />
      <Button title="Add Crypto" onPress={handleAdd} />
    </View>
  );
}

// ─── Gold/Silver Form ─────────────────────────────────────────────────────────
function GoldSilverForm({ onClose }: { onClose: () => void }) {
  const { addGoldSilver } = useApp();
  const colors = useColors();
  const [type, setType] = useState<"Gold" | "Silver">("Gold");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purity, setPurity] = useState("");

  const handleAdd = () => {
    if (!quantity || !buyPrice) {
      Alert.alert("Missing fields", "Please fill quantity and buy price.");
      return;
    }
    addGoldSilver({
      type,
      assetName: type === "Gold" ? "Gold" : "Silver",
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
      currentPrice: parseFloat(currentPrice) || parseFloat(buyPrice),
      purchaseDate,
      purity,
    });
    onClose();
  };

  return (
    <View style={{ gap: 12 }}>
      <PillSelector
        options={["Gold", "Silver"]}
        value={type}
        onChange={(v) => setType(v as "Gold" | "Silver")}
      />

      {/* Manual price notice */}
      <View
        style={{
          backgroundColor: colors.warningLight,
          borderRadius: 10,
          padding: 12,
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <Text style={{ fontSize: 16 }}>💡</Text>
        <Text style={{ flex: 1, fontSize: 12, color: colors.warning, fontWeight: "500", lineHeight: 18 }}>
          Enter prices manually. Check today's rate at{" "}
          <Text style={{ fontWeight: "700" }}>
            {type === "Gold" ? "ibja.co (IBJA Gold)" : "ibja.co (IBJA Silver)"}
          </Text>{" "}
          or your jeweller. Price is per gram in ₹.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Purity"
            value={purity}
            onChangeText={setPurity}
            placeholder="24K / 22K / 999"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Purchase Date"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Quantity (grams) *"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="10"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Buy Price/g (₹) *"
            value={buyPrice}
            onChangeText={setBuyPrice}
            keyboardType="decimal-pad"
            placeholder="6500"
          />
        </View>
      </View>
      <Input
        label={`Current Market Price/g (₹) — update manually`}
        value={currentPrice}
        onChangeText={setCurrentPrice}
        keyboardType="decimal-pad"
        placeholder="e.g. 7200 for Gold, 90 for Silver"
      />
      <Button title={`Add ${type}`} onPress={handleAdd} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function InvestmentsScreen() {
  const colors = useColors();
  const {
    stocks,
    cryptos,
    goldSilver,
    deleteStock,
    deleteCrypto,
    deleteGoldSilver,
    updateStock,
    updateCrypto,
    updateGoldSilver,
    totalInvestments,
  } = useApp();

  const [tab, setTab] = useState<"stocks" | "crypto" | "gold">("stocks");
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const refreshAllPrices = useCallback(async () => {
    setRefreshing(true);
    try {
      if (stocks.length > 0) {
        const symbols = stocks.map((s) => {
          const suffix =
            s.exchange === "NSE"
              ? ".NS"
              : s.exchange === "BSE"
              ? ".BO"
              : "";
          return suffix ? `${s.symbol}${suffix}` : s.symbol;
        });
        const prices = await fetchMultipleStockPrices(symbols);
        stocks.forEach((s, i) => {
          const sym = symbols[i];
          if (prices[sym]) updateStock(s.id, { currentPrice: prices[sym].price });
        });
      }

      if (cryptos.length > 0) {
        const geckoIds = cryptos.map((c) => coinNameToGeckoId(c.coin));
        const prices = await fetchCryptoPrices(geckoIds);
        cryptos.forEach((c) => {
          const id = coinNameToGeckoId(c.coin);
          if (prices[id]) updateCrypto(c.id, { currentPrice: prices[id] });
        });
      }

      // Gold/Silver: manual entry only — no auto-refresh (update current price in each entry)

      setLastRefreshed(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      Alert.alert("Error", "Failed to refresh some prices. Check your connection.");
    }
    setRefreshing(false);
  }, [stocks, cryptos, goldSilver, updateStock, updateCrypto, updateGoldSilver]);

  const stockTotal = stocks.reduce((s, st) => s + st.quantity * st.currentPrice, 0);
  const stockCost = stocks.reduce((s, st) => s + st.quantity * st.buyPrice, 0);
  const cryptoTotal = cryptos.reduce((s, c) => s + c.quantity * c.currentPrice, 0);
  const cryptoCost = cryptos.reduce((s, c) => s + c.quantity * c.buyPrice, 0);
  const gsTotal = goldSilver.reduce((s, g) => s + g.quantity * g.currentPrice, 0);
  const gsCost = goldSilver.reduce((s, g) => s + g.quantity * g.buyPrice, 0);

  const totalCost = stockCost + cryptoCost + gsCost;
  const totalPnl = totalInvestments - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProFinancierHeader
        title="Investments"
        subtitle="Stocks · Crypto · Gold & Silver"
        compact
        rightSlot={
          <TouchableOpacity
            onPress={refreshAllPrices}
            disabled={refreshing}
            style={{
              backgroundColor: "#ffffff25",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>
                ⟳ Live
              </Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAllPrices}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCard
            label="Total Portfolio"
            value={formatCurrency(totalInvestments)}
            style={{ flex: 1 }}
          />
          <StatCard
            label="Overall P&L"
            value={`${totalPnl >= 0 ? "▲" : "▼"} ${formatCurrency(Math.abs(totalPnl))}`}
            color={totalPnl >= 0 ? colors.success : colors.destructive}
            sub={`${Math.abs(totalPnlPct).toFixed(2)}%`}
            style={{ flex: 1 }}
          />
        </View>

        {lastRefreshed && (
          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              color: colors.mutedForeground,
              marginTop: -4,
            }}
          >
            Last refreshed: {lastRefreshed} · Pull down to refresh
          </Text>
        )}

        {/* Tab Selector */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.card,
            borderRadius: colors.radius,
            padding: 4,
            gap: 4,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {(["stocks", "crypto", "gold"] as const).map((t) => {
            const labels = {
              stocks: "📈 Stocks",
              crypto: "₿ Crypto",
              gold: "🥇 Metals",
            };
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setTab(t);
                  setShowForm(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: colors.radius - 4,
                  backgroundColor: active ? colors.primary : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? "#fff" : colors.mutedForeground,
                  }}
                >
                  {labels[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sub-stats */}
        {tab === "stocks" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard
              label="Stocks Value"
              value={formatCurrency(stockTotal)}
              style={{ flex: 1 }}
            />
            <StatCard
              label="Stocks P&L"
              value={formatCurrency(stockTotal - stockCost)}
              color={
                stockTotal - stockCost >= 0
                  ? colors.success
                  : colors.destructive
              }
              style={{ flex: 1 }}
            />
          </View>
        )}
        {tab === "crypto" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard
              label="Crypto Value"
              value={formatCurrency(cryptoTotal)}
              style={{ flex: 1 }}
            />
            <StatCard
              label="Crypto P&L"
              value={formatCurrency(cryptoTotal - cryptoCost)}
              color={
                cryptoTotal - cryptoCost >= 0
                  ? colors.success
                  : colors.destructive
              }
              style={{ flex: 1 }}
            />
          </View>
        )}
        {tab === "gold" && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard
              label="Metals Value"
              value={formatCurrency(gsTotal)}
              style={{ flex: 1 }}
            />
            <StatCard
              label="Metals P&L"
              value={formatCurrency(gsTotal - gsCost)}
              color={
                gsTotal - gsCost >= 0 ? colors.success : colors.destructive
              }
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Add Button */}
        <Button
          title={
            showForm
              ? "Cancel"
              : `+ Add ${
                  tab === "stocks"
                    ? "Stock"
                    : tab === "crypto"
                    ? "Crypto"
                    : "Gold/Silver"
                }`
          }
          variant={showForm ? "secondary" : "primary"}
          onPress={() => setShowForm((v) => !v)}
        />

        {showForm && (
          <Card>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              {tab === "stocks" && (
                <StockForm onClose={() => setShowForm(false)} />
              )}
              {tab === "crypto" && (
                <CryptoForm onClose={() => setShowForm(false)} />
              )}
              {tab === "gold" && (
                <GoldSilverForm onClose={() => setShowForm(false)} />
              )}
            </KeyboardAvoidingView>
          </Card>
        )}

        {/* Stocks List */}
        {tab === "stocks" &&
          (stocks.length === 0 ? (
            <EmptyState
              emoji="📈"
              title="No stocks yet"
              subtitle="Add stocks and tap ⟳ Live to auto-fetch prices from NSE/BSE/NYSE"
            />
          ) : (
            stocks.map((s) => {
              const pnl = (s.currentPrice - s.buyPrice) * s.quantity;
              const pct =
                s.buyPrice > 0
                  ? ((s.currentPrice - s.buyPrice) / s.buyPrice) * 100
                  : 0;
              return (
                <Card key={s.id} style={{ gap: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: colors.foreground,
                          }}
                        >
                          {s.symbol}
                        </Text>
                        {s.exchange && (
                          <Badge label={s.exchange} color={colors.primary} />
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.mutedForeground,
                          marginTop: 2,
                        }}
                      >
                        {s.company}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Delete?", `Remove ${s.symbol}?`, [
                          { text: "Cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deleteStock(s.id),
                          },
                        ])
                      }
                      style={{ padding: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          color: colors.mutedForeground,
                        }}
                      >
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.muted,
                      borderRadius: 10,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.mutedForeground,
                        }}
                      >
                        Qty
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        {s.quantity} shares
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.mutedForeground,
                        }}
                      >
                        Buy Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        ₹{s.buyPrice.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.mutedForeground,
                        }}
                      >
                        Current Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.primary,
                        }}
                      >
                        ₹{s.currentPrice.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border,
                      }}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.mutedForeground,
                        }}
                      >
                        Total Value
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.primary,
                        }}
                      >
                        {formatCurrency(s.currentPrice * s.quantity)}
                      </Text>
                    </View>
                    {s.purchaseDate ? (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          Purchase Date
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: colors.foreground,
                          }}
                        >
                          {s.purchaseDate}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <PnlBadge pnl={pnl} percent={pct} />
                </Card>
              );
            })
          ))}

        {/* Crypto List */}
        {tab === "crypto" &&
          (cryptos.length === 0 ? (
            <EmptyState
              emoji="₿"
              title="No crypto yet"
              subtitle="Add Bitcoin, Ethereum, Solana and tap ⟳ Live for INR prices"
            />
          ) : (
            cryptos.map((c) => {
              const pnl = (c.currentPrice - c.buyPrice) * c.quantity;
              const pct =
                c.buyPrice > 0
                  ? ((c.currentPrice - c.buyPrice) / c.buyPrice) * 100
                  : 0;
              return (
                <Card key={c.id} style={{ gap: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.foreground,
                      }}
                    >
                      ₿ {c.coin}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Delete?", `Remove ${c.coin}?`, [
                          { text: "Cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deleteCrypto(c.id),
                          },
                        ])
                      }
                      style={{ padding: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          color: colors.mutedForeground,
                        }}
                      >
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.muted,
                      borderRadius: 10,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Quantity
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        {c.quantity}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Buy Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        ₹{c.buyPrice.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Current Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.primary,
                        }}
                      >
                        ₹{c.currentPrice.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View
                      style={{ height: 1, backgroundColor: colors.border }}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Total Value
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.primary,
                        }}
                      >
                        {formatCurrency(c.currentPrice * c.quantity)}
                      </Text>
                    </View>
                    {c.purchaseDate ? (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          Purchase Date
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: colors.foreground,
                          }}
                        >
                          {c.purchaseDate}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <PnlBadge pnl={pnl} percent={pct} />
                </Card>
              );
            })
          ))}

        {/* Gold/Silver List */}
        {tab === "gold" &&
          (goldSilver.length === 0 ? (
            <EmptyState
              emoji="🥇"
              title="No metals yet"
              subtitle="Track gold & silver with live global prices in ₹/gram"
            />
          ) : (
            goldSilver.map((g) => {
              const pnl = (g.currentPrice - g.buyPrice) * g.quantity;
              const pct =
                g.buyPrice > 0
                  ? ((g.currentPrice - g.buyPrice) / g.buyPrice) * 100
                  : 0;
              const isGold = g.type === "Gold";
              return (
                <Card key={g.id} style={{ gap: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>
                        {isGold ? "🥇" : "🥈"}
                      </Text>
                      <View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: colors.foreground,
                          }}
                        >
                          {g.type}
                        </Text>
                        {g.purity ? (
                          <Text
                            style={{
                              fontSize: 12,
                              color: isGold ? colors.gold : colors.mutedForeground,
                              fontWeight: "600",
                            }}
                          >
                            {g.purity}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Delete?",
                          `Remove this ${g.type} entry?`,
                          [
                            { text: "Cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => deleteGoldSilver(g.id),
                            },
                          ]
                        )
                      }
                      style={{ padding: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          color: colors.mutedForeground,
                        }}
                      >
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.muted,
                      borderRadius: 10,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Quantity
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        {g.quantity} grams
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Buy Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        ₹{g.buyPrice.toLocaleString("en-IN")}/g
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Current Price
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: isGold ? colors.gold : colors.primary,
                        }}
                      >
                        ₹{g.currentPrice.toLocaleString("en-IN")}/g
                      </Text>
                    </View>
                    <View
                      style={{ height: 1, backgroundColor: colors.border }}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ fontSize: 13, color: colors.mutedForeground }}
                      >
                        Total Value
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: isGold ? colors.gold : colors.primary,
                        }}
                      >
                        {formatCurrency(g.currentPrice * g.quantity)}
                      </Text>
                    </View>
                    {g.purchaseDate ? (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          Purchase Date
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: colors.foreground,
                          }}
                        >
                          {g.purchaseDate}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <PnlBadge pnl={pnl} percent={pct} />
                </Card>
              );
            })
          ))}
      </ScrollView>
    </View>
  );
}
