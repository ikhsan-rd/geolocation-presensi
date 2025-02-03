// Set tanggal dan jam otomatis saat halaman pertama kali diload
window.onload = function ()
{
    setTanggal();  // Set hanya tanggal saat load
};

// Fungsi untuk set tanggal otomatis
function setTanggal()
{
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0]; // Tanggal dalam format YYYY-MM-DD
    document.getElementById('tanggal').value = tanggal;
    document.getElementById('jam').placeholder = "Otomatis"; // Placeholder untuk jam
}

// Fungsi untuk set tanggal dan jam saat submit
function setTanggalJam()
{
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0]; // Tanggal dalam format YYYY-MM-DD
    const jam = now.toTimeString().split(' ')[0].substring(0,5); // Jam dalam format HH:MM

    document.getElementById('tanggal').value = tanggal;
    document.getElementById('jam').value = jam;
}

// Ambil IP Address
let userIP = '';
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data =>
    {
        userIP = data.ip;
        checkUserIP(userIP); // Cek apakah IP sudah ada di tabel 2
    })
    .catch(error => console.error('Gagal mendapatkan IP:',error));

// Fungsi untuk mengecek apakah IP sudah ada di Tabel 2
function checkUserIP(ip)
{
    fetch(`https://script.google.com/macros/s/AKfycbx4moZcry_dB7f1jdOmv7HwgKw5xp3jQt9PKJDkwIsiepTLC5dKKDgAb15bPBHi6XOGYw/exec?checkIP=${ip}`)
        .then(response => response.json())
        .then(data =>
        {
            if (data.exists)
            {
                document.getElementById('nama').value = data.nama; // Auto-fill nama dari Tabel 2 jika IP sudah terdaftar
                document.getElementById('nama').readOnly = true; // Kunci input nama untuk mencegah perubahan
            }
        })
        .catch(error => console.error('Gagal mengecek IP:',error));
}

function showLoading()
{
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading()
{
    document.getElementById('loading').style.display = 'none';
}
// Tambahkan loading saat klik "Cek Lokasi"
document.getElementById('getLocationButton').addEventListener('click',function ()
{
    showLoading();
    if (navigator.geolocation)
    {
        navigator.geolocation.getCurrentPosition(
            function (position)
            {
                document.getElementById('latitude').value = position.coords.latitude;
                document.getElementById('longitude').value = position.coords.longitude;
                hideLoading();
            },
            function ()
            {
                alert('Gagal mendapatkan lokasi.');
                hideLoading();
            }
        );
    } else
    {
        alert('Browser Anda tidak mendukung geolokasi.');
        hideLoading();
    }
});

// Tambahkan loading saat klik "Submit"
document.getElementById('absenForm').addEventListener('submit',function (e)
{
    e.preventDefault();
    showLoading();

    setTanggalJam();
    const formData = new FormData(this);
    formData.append('ip',userIP);

    fetch('https://script.google.com/macros/s/AKfycbx4moZcry_dB7f1jdOmv7HwgKw5xp3jQt9PKJDkwIsiepTLC5dKKDgAb15bPBHi6XOGYw/exec',{
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data =>
        {
            alert(data.message);
            this.reset();
            setTanggal();
            hideLoading();
        })
        .catch(error =>
        {
            alert('Gagal mengirim data.');
            hideLoading();
            console.error(error);
        });
});
