window.onload = function ()
{
    setTanggal();
    hideRecheck();
    validateForm();
    console.log("jalan");
};
//event Listener
document.getElementById('id').addEventListener('input', validateForm);
document.getElementById('nama').addEventListener('input', validateForm);
document.getElementById('departemen').addEventListener('input', validateForm);
document.getElementById('lokasi').addEventListener('input', validateForm);
document.querySelectorAll('input[name="presensi"]').forEach((radio) => {
    radio.addEventListener('change', validateForm);
});

// Set tanggal otomatis
function setTanggal()
{
    const now = new Date();
    document.getElementById('tanggal').value = now.toISOString().split('T')[0];
}

// Mengambil IP Address
async function getIPAddress()
{
    try
    {
        let response = await fetch('https://api.ipify.org?format=json');
        let data = await response.json();
        return data.ip;
    } catch (error)
    {
        console.error("Gagal mendapatkan IP:",error);
        return "Unknown";
    }
}

// Mengambil UUID, jika tidak ada maka buat yang baru
function getUUID()
{
    let storedUUID = localStorage.getItem('deviceUUID');
    if (!storedUUID)
    {
        storedUUID = crypto.randomUUID();
        localStorage.setItem('deviceUUID',storedUUID);
    }
    return storedUUID;
}

// Mengambil fingerprint
async function getFingerprint()
{
    try
    {
        const fpPromise = FingerprintJS.load();
        const fp = await fpPromise;
        const result = await fp.get();
        return result.visitorId;
    } catch (error)
    {
        console.error("Gagal mendapatkan fingerprint:",error);
        return "Unknown";
    }
}

// Mengambil data user dari Google Apps Script
async function fetchUserData(id)
{
    try
    {
        let response = await fetch(`https://script.google.com/macros/s/AKfycbxij-FGsrTeaFpC6bDDbE-02pEWdhgpVMWwLe8LACYvNgHF8IEfd-P106SYvgDbShkyig/exec?getUser=${id}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        let data = await response.json();
        return data.exists ? { nama: data.nama,departemen: data.departemen } : null;
    } catch (error)
    {
        console.error("Gagal mengambil data pengguna:",error);
        return null;
    }
}

// Event handler untuk tombol "Check"
document.getElementById('checkButton').addEventListener('click',async function ()
{
    let userId = document.getElementById('id').value.trim();
    if (!userId)
    {
        alert("Masukkan ID terlebih dahulu!");
        return;
    }
    showLoading();
    let userData = await fetchUserData(userId);
    hideLoading();
    if (!userData)
    {
        alert("ID tidak ditemukan dalam database.");
        return;
    }
    document.getElementById('nama').value = userData.nama;
    document.getElementById('departemen').value = userData.departemen;

    getLocationAndDecode();
});

// Validasi form sebelum submit
function validateForm()
{
    const id = document.getElementById('id').value.trim();
    const nama = document.getElementById('nama').value.trim();
    const departemen = document.getElementById('departemen').value.trim();
    const lokasi = document.getElementById('lokasi').value.trim();
    const presensi = document.querySelector('input[name="presensi"]:checked');

    if (id && nama && departemen && lokasi && presensi)
    {
        enableSubmit();
    } else
    {
        disableSubmit();
    }
}

// Event untuk Tombol "Re-Check Location"
document.getElementById('reCheckLocationButton').addEventListener('click',function ()
{
    getLocationAndDecode(); // Re-cek lokasi tanpa mengubah Nama & Departemen
});

// Mengambil lokasi & decode alamat
async function getLocationAndDecode()
{
    showLoading();

    if (navigator.geolocation)
    {
        navigator.geolocation.getCurrentPosition(
            async function (position)
            {
                let latitude = position.coords.latitude;
                let longitude = position.coords.longitude;

                document.getElementById('latitude').value = latitude;
                document.getElementById('longitude').value = longitude;

                // Ambil alamat dari Nominatim API
                let alamat = await getAddressFromCoordinates(latitude,longitude);
                hideLoading();
                if (alamat)
                {
                    showRecheck();
                    document.getElementById('lokasi').value = alamat;
                } else
                {
                    alert("Gagal mendapatkan alamat. Coba ulangi.");
                }
            },
            function (error)
            {
                hideLoading();
                console.error("Gagal mendapatkan lokasi:",error.message);
                alert(`Gagal mendapatkan lokasi: ${error.message}`);
            }
        );
    } else
    {
        hideLoading();
        alert('Browser Anda tidak mendukung geolokasi.');
    }
}

// Mengambil alamat dari koordinat
async function getAddressFromCoordinates(latitude,longitude)
{
    try
    {
        let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        let data = await response.json();
        return data.display_name || "Lokasi tidak ditemukan";
    } catch (error)
    {
        console.error("Gagal mendapatkan lokasi:",error);
        return "Error saat mengambil lokasi";
    }
}

// Cegah submit jika lokasi belum berhasil didecode
document.getElementById('absenForm').addEventListener('submit',function (e)
{
    let alamat = document.getElementById('lokasi').value.trim();
    if (!alamat || alamat === "Lokasi tidak ditemukan" || alamat === "Error saat mengambil lokasi")
    {
        alert("Silakan cek lokasi terlebih dahulu sebelum submit.");
        e.preventDefault();
    }
});

// Submit form
document.getElementById('absenForm').addEventListener('submit',async function (e)
{
    e.preventDefault();
    showLoading();

    const uuid = getUUID();
    const fingerprint = await getFingerprint();
    const ip = await getIPAddress();
    const nama = document.getElementById('nama').value;
    const id = document.getElementById('id').value;
    const departemen = document.getElementById('departemen').value;
    const tanggal = document.getElementById('tanggal').value;
    const jam = new Date().toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });    
    const lokasi = document.getElementById('lokasi').value;
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const presensi = document.querySelector('input[name="presensi"]:checked').value;

    let formData = new URLSearchParams({
        id,nama,departemen,presensi,tanggal,jam,lokasi,latitude,longitude,uuid,fingerprint,ip
    });

    try
    {
        let response = await fetch('https://script.google.com/macros/s/AKfycbxij-FGsrTeaFpC6bDDbE-02pEWdhgpVMWwLe8LACYvNgHF8IEfd-P106SYvgDbShkyig/exec',{
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        });
        let data = await response.json();
        alert(data.message);
    } catch (error)
    {
        console.error('Gagal mengirim data:',error);
        alert("Terjadi kesalahan saat mengirim data.");
    }

    hideLoading();
});

// Fungsi tambahan
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }
function showRecheck() { document.getElementById('reCheckLocationButton').style.display = 'flex'; }
function hideRecheck() { document.getElementById('reCheckLocationButton').style.display = 'none'; }
function enableSubmit() { document.getElementById('submitButton').disabled = false; }
function disableSubmit() { document.getElementById('submitButton').disabled = true; }

