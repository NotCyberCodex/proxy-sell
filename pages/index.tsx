import Head from 'next/head';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram: any;
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [gbAmount, setGbAmount] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initData, setInitData] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      
      // Get user data
      const userData = tg.initDataUnsafe?.user;
      if (userData) {
        setUser(userData);
      }
      
      // Get init data
      setInitData(tg.initData);
      
      // Expand the web app
      tg.expand();
    }
    
    // Load user data and products
    loadUserData();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      calculateTotalPrice();
    }
  }, [selectedProduct, gbAmount, quantity]);

  const loadUserData = async () => {
    try {
      const response = await fetch(`/api/wallet/balance?init_data=${encodeURIComponent(initData)}`);
      const data = await response.json();
      if (data.balance !== undefined) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`/api/products/list?init_data=${encodeURIComponent(initData)}`);
      const data = await response.json();
      if (data && Array.isArray(data)) {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProduct(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const calculateTotalPrice = () => {
    if (selectedProduct) {
      const price = gbAmount * quantity * selectedProduct.pricePerGb;
      setTotalPrice(parseFloat(price.toFixed(2)));
    }
  };

  const handleDeposit = async () => {
    if (!initData || totalPrice <= 0) return;

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          init_data: initData,
          amount: totalPrice,
          description: 'Balance deposit'
        }),
      });

      const data = await response.json();
      
      if (data.checkout_url) {
        // Redirect to payment page
        window.location.href = data.checkout_url;
      } else {
        alert('Error creating checkout: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Error creating checkout: ' + error.message);
    }
  };

  const handlePurchase = async () => {
    if (!initData || !selectedProduct || totalPrice > balance) return;

    try {
      const response = await fetch('/api/proxy/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          init_data: initData,
          productId: selectedProduct.id,
          gbAmount: gbAmount,
          quantity: quantity
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Purchase successful!');
        setBalance(data.remainingBalance);
        // Show proxy details
        console.log('Proxy details:', data.proxyDetails);
      } else {
        alert('Purchase failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error purchasing proxy:', error);
      alert('Error purchasing proxy: ' + error.message);
    }
  };

  const incrementQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>XZ Proxy - Telegram Mini App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          body {
            background: #0d1117;
            color: #e6edf3;
            padding: 16px;
            padding-bottom: 80px;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
          }
          
          .header {
            background: #161b22;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #238636;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            overflow: hidden;
          }
          
          .user-details h2 {
            font-size: 18px;
            margin-bottom: 4px;
          }
          
          .user-details p {
            font-size: 14px;
            color: #8b949e;
          }
          
          .balance {
            background: #161b22;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            margin-bottom: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .balance h3 {
            font-size: 16px;
            color: #8b949e;
            margin-bottom: 8px;
          }
          
          .balance-amount {
            font-size: 32px;
            font-weight: bold;
            color: #58a6ff;
          }
          
          .tabs {
            display: flex;
            background: #161b22;
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
          }
          
          .tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            transition: background 0.3s;
          }
          
          .tab.active {
            background: #238636;
          }
          
          .tab-content {
            background: #161b22;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .product-card {
            background: #0d1117;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid #30363d;
          }
          
          .product-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          
          .product-title {
            font-size: 18px;
            font-weight: bold;
          }
          
          .product-price {
            color: #58a6ff;
            font-weight: bold;
          }
          
          .product-description {
            color: #8b949e;
            margin-bottom: 16px;
            font-size: 14px;
          }
          
          .gb-selector {
            margin-bottom: 16px;
          }
          
          .gb-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
            gap: 8px;
            margin-bottom: 16px;
          }
          
          .gb-option {
            padding: 8px;
            text-align: center;
            background: #21262d;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.3s;
          }
          
          .gb-option.active {
            background: #238636;
          }
          
          .quantity-selector {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }
          
          .quantity-btn {
            width: 40px;
            height: 40px;
            background: #21262d;
            border: none;
            border-radius: 6px;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .quantity-display {
            width: 60px;
            height: 40px;
            background: #21262d;
            border: none;
            border-radius: 6px;
            text-align: center;
            margin: 0 8px;
            font-size: 16px;
          }
          
          .total-price {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 16px 0;
            color: #58a6ff;
          }
          
          .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.3s;
          }
          
          .btn-primary {
            background: #238636;
            color: white;
          }
          
          .btn-secondary {
            background: #58a6ff;
            color: white;
          }
          
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .dashboard-section {
            margin-bottom: 16px;
          }
          
          .dashboard-title {
            font-size: 18px;
            margin-bottom: 12px;
            font-weight: bold;
          }
          
          .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .dashboard-card {
            background: #0d1117;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            border: 1px solid #30363d;
          }
          
          .dashboard-card h3 {
            font-size: 14px;
            color: #8b949e;
            margin-bottom: 8px;
          }
          
          .dashboard-card p {
            font-size: 20px;
            font-weight: bold;
          }
        `}</style>
      </Head>

      <main>
        <div className="header">
          <div className="user-info">
            <div className="user-avatar">
              {user?.first_name?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <h2>{user?.first_name} {user?.last_name}</h2>
              <p>@{user?.username || 'user'}</p>
            </div>
          </div>
        </div>

        <div className="balance">
          <h3>Your Balance</h3>
          <div className="balance-amount">${balance.toFixed(2)}</div>
        </div>

        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </div>
          <div 
            className={`tab ${activeTab === 'buy' ? 'active' : ''}`} 
            onClick={() => setActiveTab('buy')}
          >
            Buy Proxy
          </div>
          <div 
            className={`tab ${activeTab === 'deposit' ? 'active' : ''}`} 
            onClick={() => setActiveTab('deposit')}
          >
            Deposit
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <div className="dashboard-section">
              <h3 className="dashboard-title">Quick Stats</h3>
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <h3>Total Spent</h3>
                  <p>$0.00</p>
                </div>
                <div className="dashboard-card">
                  <h3>Proxies Used</h3>
                  <p>0</p>
                </div>
                <div className="dashboard-card">
                  <h3>Active Proxies</h3>
                  <p>0</p>
                </div>
                <div className="dashboard-card">
                  <h3>Expiry</h3>
                  <p>N/A</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-section">
              <h3 className="dashboard-title">Recent Activity</h3>
              <p style={{ textAlign: 'center', padding: '16px', color: '#8b949e' }}>
                No recent activity
              </p>
            </div>
          </div>
        )}

        {activeTab === 'buy' && (
          <div className="tab-content">
            {selectedProduct && (
              <>
                <div className="product-card">
                  <div className="product-header">
                    <div className="product-title">{selectedProduct.name}</div>
                    <div className="product-price">${selectedProduct.pricePerGb}/GB</div>
                  </div>
                  <div className="product-description">{selectedProduct.description}</div>
                  
                  <div className="gb-selector">
                    <h4>Select GB Amount:</h4>
                    <div className="gb-options">
                      {selectedProduct.gbOptions.map((gb: number) => (
                        <div
                          key={gb}
                          className={`gb-option ${gb === gbAmount ? 'active' : ''}`}
                          onClick={() => setGbAmount(gb)}
                        >
                          {gb}GB
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="quantity-selector">
                    <button className="quantity-btn" onClick={decrementQuantity}>-</button>
                    <input 
                      type="number" 
                      className="quantity-display" 
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max={selectedProduct.stock}
                    />
                    <button className="quantity-btn" onClick={incrementQuantity}>+</button>
                  </div>
                  
                  <div className="total-price">
                    Total: ${totalPrice.toFixed(2)}
                  </div>
                  
                  <button 
                    className="btn btn-primary"
                    onClick={handlePurchase}
                    disabled={totalPrice > balance}
                  >
                    {totalPrice > balance ? 'Insufficient Balance' : 'Purchase Proxy'}
                  </button>
                </div>
                
                <div style={{ marginTop: '16px', padding: '12px', background: '#0d1117', borderRadius: '8px', border: '1px solid #30363d' }}>
                  <h4>Balance Info</h4>
                  <p>Current balance: ${balance.toFixed(2)}</p>
                  <p>Required: ${totalPrice.toFixed(2)}</p>
                  <p>Remaining after purchase: ${(balance - totalPrice).toFixed(2)}</p>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="tab-content">
            <div className="product-card">
              <h3 style={{ marginBottom: '16px' }}>Add Funds to Your Account</h3>
              
              <div className="gb-selector">
                <h4>How much would you like to deposit?</h4>
                <div className="gb-options">
                  {[5, 10, 20, 50, 100].map((amount) => (
                    <div
                      key={amount}
                      className={`gb-option ${totalPrice === amount ? 'active' : ''}`}
                      onClick={() => setTotalPrice(amount)}
                    >
                      ${amount}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label>Custom Amount:</label>
                <input
                  type="number"
                  value={totalPrice || ''}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    color: 'white',
                    marginTop: '8px'
                  }}
                />
              </div>
              
              <div className="total-price">
                Deposit Amount: ${totalPrice.toFixed(2)}
              </div>
              
              <button 
                className="btn btn-secondary"
                onClick={handleDeposit}
                disabled={totalPrice <= 0}
              >
                {totalPrice <= 0 ? 'Enter Amount' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}