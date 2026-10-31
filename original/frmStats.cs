using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace CSharpRPG
{
    public partial class frmStats : Form
    {
        private Character _c;
        private TileSet _ts;

        public frmStats(TileSet ts, Character c)
        {
            InitializeComponent();
            _c = c;
            _ts = ts;
        }

        private void btnClose_Click(object sender, EventArgs e)
        {
            Close();

        }

        private void frmStats_Load(object sender, EventArgs e)
        {
            LoadData();
            _c.PropertyChanged += new PropertyChangedEventHandler(_c_PropertyChanged);
        }

        void _c_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            LoadData();
        }


        private void LoadData()
        {
            lblCurrentHP.Text = _c.HP.ToString();
            lblMaxHP.Text = _c.MaxHP.ToString();
            progressBar1.Maximum = _c.MaxHP;
            progressBar1.Value = _c.HP;

            listView1.Items.Clear();
            // fill in inventory
            listView1.LargeImageList = new ImageList();
            listView1.LargeImageList.ImageSize = new Size(32, 32);
            foreach (Item i in _c.Inventory)
            {
                listView1.LargeImageList.Images.Add(i.TileId.ToString(), _ts.GetTile(i.TileId));
                ListViewItem lvi = new ListViewItem(i.ToString(), i.TileId.ToString());

                //color our active item differently to indicate which one it is.  I couldn't find an image back color, which would have been cool.
                if (i==_c.activeItem){
                    lvi.BackColor = Color.Chocolate;
                    lvi.ForeColor = Color.White;
                }

                listView1.Items.Add(lvi);

                
            }


        }

        private void listView1_KeyUp(object sender, KeyEventArgs e)
        {
           if (e.KeyCode == Keys.Delete)
            {
               
               // TODO: Doesn't work if multiple items selected
               // due to the interplay of auto-update
                if (listView1.SelectedIndices.Count != 1)
                {
                    MessageBox.Show("Can only delete one at a time");
                    return;
                }
                foreach (ListViewItem item in listView1.SelectedItems)
                {
                    int itemIndex = listView1.Items.IndexOf(item);
                    _c.Inventory.RemoveAt(itemIndex);
                    
                }
                
            }
        }

        private void listView1_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            //take the first selected since there can be a multiple selection.
            if (listView1.SelectedIndices.Count > 0) 
                _c.activeItem = _c.Inventory[listView1.SelectedIndices[0]];
        }

        private void btnUnequip_Click(object sender, EventArgs e)
        {
            _c.activeItem = null;

        }

        private void listView1_SelectedIndexChanged(object sender, EventArgs e)
        {

        }



   }
}
