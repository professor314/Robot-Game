using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;
using System.ComponentModel;
namespace CSharpRPG.Symbols
{
    class Treasure : ISymbol, INotifyPropertyChanged

    {

        
        private Item ti;

        private bool visible = true;
        //pass the item as a parameter
        public Treasure(Item TreasureItem)
        {
           
           ti = TreasureItem;
        }
        #region ISymbol Members

        

        public System.Drawing.Color Color
        {
            get { return Color.DarkGray; }
        }

        public int? TileID           
        {

            get
            {
                if (visible == false) return null;
                else return ti.TileId;
            } 
        }

       
        public bool Enter(Character chr)
        {
          
            if (chr.HasCapacityRemaining() && visible)
            {  
                    //check to see if the Item is the one that we already have
                    if (!chr[ti])
                    {
                        chr.Inventory.Add(ti);
                        visible = false;
                        PropertyChangeNotify("TileID");
                        Database1DataSetTableAdapters.tblInventoryTableAdapter
                            inta = new Database1DataSetTableAdapters.tblInventoryTableAdapter();
                        inta.Insert(ti.TileId);
                    }

            }
            
            return true;
        }

        #endregion


        #region INotifyPropertyChanged Members

        public event PropertyChangedEventHandler PropertyChanged;

        protected void PropertyChangeNotify(string change)
        {
            if (PropertyChanged != null)
                PropertyChanged(this, new PropertyChangedEventArgs(change));
        }

        #endregion
    }

}
