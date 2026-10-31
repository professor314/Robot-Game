using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;
using System.ComponentModel;

namespace CSharpRPG
{
  public abstract class Character : INotifyPropertyChanged
    {

        public abstract int TileID { get; }
        public abstract int Capacity { get; }
        public abstract int Level { get; }
        public abstract int unarmedDamage { get; }
        public abstract string charName { get; }

        private Item _activeItem;
        private BindingList<Item> _inv = new BindingList<Item>();
        public BindingList<Item> Inventory
        {
            get
            {
                return _inv;
            }
        }
        public bool this[Item _Item]
        {
            get
            {
               foreach (Item i in Inventory)
               {
                   if (i == _Item)
                       return true;
               }
                return false;
            }
        
        }


        public Item activeItem
        {
            get
            {
                return _activeItem;
            }
            set
            {
                if (value == null)
                {
                    _activeItem = null;
                    PropertyChangeNotify(new characterPropertyChangedEventArgs("activeItem", "No item"));
                }
                else
                {
                    
                    if (!Inventory.Contains(value)) 
                        throw new Exception("Cannot equip an item which is not in the inventory");

                    _activeItem = value;
                    PropertyChangeNotify(new characterPropertyChangedEventArgs("activeItem", _activeItem.ToString()));
                }
            }
        }

        public static bool operator <(Character a, Character b)
        {
            return a.Level < b.Level;
        }

        public static bool operator >(Character a, Character b)
        {
            return a.Level > b.Level;
        }

        public static bool operator <(Character a, int level)
        {
            return a.Level < level;
        }
        public static bool operator >(Character a, int level)
        {
            return a.Level > level;
        }
       
               
        // TODO: not monitoring property change on this one
        public Point Position { get; set; }

        public void attack (Character t)
        {

            //attack unarmed if you have no active item.  otherwise attempt to attack with the active item.

            int damageDealt;

            if (_activeItem == null)
            {
                if (t.HP <= unarmedDamage) damageDealt = t.HP;
                else damageDealt = unarmedDamage;

                t.HP -= damageDealt;
            }
            else damageDealt = _activeItem.Attack(t);

            attackEventNotify(charName, t.charName, damageDealt);
        }

        public bool HasCapacityRemaining()
        {
            return Inventory.Count < Capacity;
        }

        private int _hp;
        public int HP { 
            get
            {
                return _hp;
            }
            set
            {
                // TODO: prohibit illegal values (e.g. < 0)
                int newValue = value - _hp;
                _hp = value;
                PropertyChangeNotify(new characterPropertyChangedEventArgs("HP", newValue.ToString()));
                
            }
        }
        public abstract int MaxHP { get; }


        public Character()
        {
            HP = MaxHP;
            _inv.ListChanged += new ListChangedEventHandler(_inv_ListChanged);
        }


        void _inv_ListChanged(object sender, ListChangedEventArgs e)
        {
            if (e.ListChangedType==ListChangedType.ItemAdded) PropertyChangeNotify(new characterPropertyChangedEventArgs("Inventory, added",((BindingList<Item>)sender)[e.NewIndex].ToString()));
            else if (e.ListChangedType == ListChangedType.ItemDeleted) PropertyChangeNotify(new characterPropertyChangedEventArgs("Inventory, item removed.",""));
        }


        public class characterPropertyChangedEventArgs : PropertyChangedEventArgs
        {
            string _actor;

            public string actor
            {

                get {return _actor;}
                set { _actor = value; }
            }    
            public characterPropertyChangedEventArgs(string prop_name, string actor_value) : base(prop_name)
            {
                actor = actor_value;
            }
        }


        #region INotifyPropertyChanged Members

        public event PropertyChangedEventHandler PropertyChanged;

        protected void PropertyChangeNotify(characterPropertyChangedEventArgs change)
        {
            if (PropertyChanged != null)
                PropertyChanged(this, change);
        }

        #endregion

        public static event attackEventHandler attackHappened;
        public delegate void attackEventHandler(string attacker, string target, int damageDealt);
        protected void attackEventNotify(string attacker, string target, int damageDealt)
        {
            if (attackHappened!=null) attackHappened(attacker, target, damageDealt);
        }
    }
}
